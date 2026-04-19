import "server-only";

import { existsSync } from "node:fs";

import { ImageAnnotatorClient } from "@google-cloud/vision";

import { getOptionalEnv, getOptionalMultilineEnv } from "@/lib/env";

import type { ListingOcrResult } from "./draft-types";
import {
  collectPackageDateCandidates,
  detectPackageDateLabel,
  parsePackageDateCandidate,
} from "./date-parser";

let cachedVisionClient: ImageAnnotatorClient | null = null;

/** Fixes common .env PEM mistakes (Windows / copy-paste). */
function normalizeInlinePrivateKey(key: string) {
  let k = key.trim().replace(/\r\n/g, "\n");
  k = k.replace(/\\n/g, "\n");
  return k;
}

function visionProjectId() {
  return getOptionalEnv("GOOGLE_CLOUD_PROJECT_ID") ?? getOptionalEnv("GOOGLE_CLOUD_PROJECT");
}

function isGoogleVisionConfigured() {
  const adc = getOptionalEnv("GOOGLE_APPLICATION_CREDENTIALS");
  if (adc && existsSync(adc)) {
    return true;
  }

  const clientEmail = getOptionalEnv("GOOGLE_CLOUD_CLIENT_EMAIL");
  const privateKey = getOptionalMultilineEnv("GOOGLE_CLOUD_PRIVATE_KEY");

  return Boolean(clientEmail && privateKey);
}

function getVisionClient(): ImageAnnotatorClient | null {
  if (!isGoogleVisionConfigured()) {
    return null;
  }

  if (cachedVisionClient) {
    return cachedVisionClient;
  }

  const projectId = visionProjectId();
  const adc = getOptionalEnv("GOOGLE_APPLICATION_CREDENTIALS");

  if (adc && existsSync(adc)) {
    cachedVisionClient = new ImageAnnotatorClient({
      keyFilename: adc,
      projectId,
    });
    return cachedVisionClient;
  }

  const clientEmail = getOptionalEnv("GOOGLE_CLOUD_CLIENT_EMAIL")!;
  const privateKey = normalizeInlinePrivateKey(getOptionalMultilineEnv("GOOGLE_CLOUD_PRIVATE_KEY")!);

  cachedVisionClient = new ImageAnnotatorClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    projectId,
  });

  return cachedVisionClient;
}

function normalizeOcrText(rawText: string) {
  return rawText.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
}

export async function runListingOcr(file: File): Promise<ListingOcrResult> {
  const client = getVisionClient();

  if (!client) {
    return {
      status: "unavailable",
      rawText: "",
      packageDate: "",
      packageDateKind: "other",
      packageDateLabel: "",
      reason:
        "OCR is not configured. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or set GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT_ID. See .env.example.",
    };
  }

  try {
    const [response] = await client.textDetection({
      image: {
        content: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    });
    const rawText = normalizeOcrText(
      response.fullTextAnnotation?.text?.trim() ??
        response.textAnnotations?.[0]?.description?.trim() ??
        "",
    );
    const detectedLabel = detectPackageDateLabel(rawText);

    for (const candidate of collectPackageDateCandidates(rawText)) {
      const packageDate = parsePackageDateCandidate(candidate);

      if (packageDate) {
        return {
          status: "succeeded",
          rawText,
          packageDate,
          packageDateKind: detectedLabel.packageDateKind,
          packageDateLabel: detectedLabel.packageDateLabel,
        };
      }
    }

    return {
      status: "manual_required",
      rawText,
      packageDate: "",
      packageDateKind: "other",
      packageDateLabel: "",
      reason: rawText
        ? "OCR found text but could not confidently parse a supported package date."
        : "OCR could not find readable package-date text in that image.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR is unavailable.";
    const reason =
      /requires billing|enable billing on project/i.test(message)
        ? "OCR is temporarily unavailable: the Google Cloud project needs billing enabled (Vision API requires it, even within free-tier limits). Enter the date manually for now, or try again after billing is enabled."
        : /DECODER|1E08010C|DECODER routines|unsupported/i.test(message)
          ? "OCR could not read your Google service account key (invalid PEM in GOOGLE_CLOUD_PRIVATE_KEY is common on Windows). Fix: set GOOGLE_APPLICATION_CREDENTIALS to the full path of the downloaded JSON key file, or put the private key in .env as one line with \\n between PEM lines inside double quotes. See .env.example."
          : message;

    return {
      status: "unavailable",
      rawText: "",
      packageDate: "",
      packageDateKind: "other",
      packageDateLabel: "",
      reason,
    };
  }
}
