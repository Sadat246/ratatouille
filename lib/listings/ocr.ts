import "server-only";

import { ImageAnnotatorClient } from "@google-cloud/vision";

import { getOptionalEnv, getOptionalMultilineEnv } from "@/lib/env";

import type { ListingOcrResult } from "./draft-types";
import {
  collectPackageDateCandidates,
  detectPackageDateLabel,
  parsePackageDateCandidate,
} from "./date-parser";

let cachedVisionClient: ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (cachedVisionClient) {
    return cachedVisionClient;
  }

  const clientEmail = getOptionalEnv("GOOGLE_CLOUD_CLIENT_EMAIL");
  const privateKey = getOptionalMultilineEnv("GOOGLE_CLOUD_PRIVATE_KEY");
  const projectId =
    getOptionalEnv("GOOGLE_CLOUD_PROJECT_ID") ??
    getOptionalEnv("GOOGLE_CLOUD_PROJECT");

  cachedVisionClient = clientEmail && privateKey
    ? new ImageAnnotatorClient({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        projectId,
      })
    : new ImageAnnotatorClient(
        projectId
          ? {
              projectId,
            }
          : undefined,
      );

  return cachedVisionClient;
}

function normalizeOcrText(rawText: string) {
  return rawText.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
}

export async function runListingOcr(file: File): Promise<ListingOcrResult> {
  const client = getVisionClient();

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

    return {
      status: "unavailable",
      rawText: "",
      packageDate: "",
      packageDateKind: "other",
      packageDateLabel: "",
      reason: message,
    };
  }
}
