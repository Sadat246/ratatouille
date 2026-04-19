import "server-only";

import { z } from "zod";

import { getOptionalEnv } from "@/lib/env";
import type {
  GeminiProductAutofill,
  GeminiSealAssessment,
  ListingGeminiAutofillResult,
} from "@/lib/listings/ai-autofill-types";
import { listingCategoryValues, type ListingCategory } from "@/lib/listings/categories";
import { parsePackageDateInput } from "@/lib/listings/date-parser";
import { packageDateKindValues, type PackageDateKind } from "@/lib/listings/shared";

export type {
  GeminiProductAutofill,
  GeminiSealAssessment,
  ListingGeminiAutofillResult,
} from "@/lib/listings/ai-autofill-types";

async function fileToBase64Part(file: File): Promise<{ inlineData: { mimeType: string; data: string } }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
  return {
    inlineData: {
      mimeType,
      data: buf.toString("base64"),
    },
  };
}

const responseSchema = z.object({
  title: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  customCategory: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  packageDate: z.string().nullable().optional(),
  packageDateKind: z.string().nullable().optional(),
  packageDateLabel: z.string().nullable().optional(),
  rawTextFromExpiryPhoto: z.string().nullable().optional(),
  seal: z
    .object({
      appearsFactorySealed: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      notes: z.string(),
    })
    .nullable()
    .optional(),
});

function normalizeCategory(value: string | null | undefined): ListingCategory | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  return (listingCategoryValues as readonly string[]).includes(v)
    ? (v as ListingCategory)
    : null;
}

function normalizePackageDateKind(value: string | null | undefined): PackageDateKind | null {
  if (!value) return null;
  const v = value.toLowerCase().trim().replace(/\s+/g, "_");
  return (packageDateKindValues as readonly string[]).includes(v) ? (v as PackageDateKind) : null;
}

/**
 * One multimodal call: product image always; seal image optional for factory-seal assessment.
 * Requires GEMINI_API_KEY in the environment.
 */
export async function runListingGeminiAutofill(params: {
  product: File;
  seal?: File;
  /** Package-date / expiry crop — used to read printed dates when OCR misses. */
  expiry?: File;
}): Promise<ListingGeminiAutofillResult> {
  const apiKey = getOptionalEnv("GEMINI_API_KEY");
  if (!apiKey) {
    return {
      status: "unavailable",
      reason:
        "Gemini autofill is not configured. Add GEMINI_API_KEY to .env.local when you are ready (see .env.example).",
    };
  }

  const model =
    getOptionalEnv("GEMINI_MODEL")?.trim() || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const hasSeal = Boolean(params.seal);
  const hasExpiry = Boolean(params.expiry);

  const expiryRules = hasExpiry
    ? `- The EXPIRY image (last image) shows the printed date area. Set "packageDate" as yyyy-MM-dd if clearly readable; "packageDateKind" one of: ${packageDateKindValues.join(", ")}; "packageDateLabel" e.g. "Best by"; "rawTextFromExpiryPhoto" transcribe visible text from that image.`
    : '- Omit packageDate fields and rawTextFromExpiryPhoto if no expiry image was provided.';

  const systemPrompt = `You help staff at a grocery surplus / food-rescue marketplace create listing drafts from photos.

Rules:
- Only output valid JSON matching the schema below. No markdown fences.
- "category" must be one of: ${listingCategoryValues.join(", ")}. Pick the best fit from the PRODUCT image (packaging, visible food type).
- If the product is clearly not in that list, use "other" and put a short phrase in customCategory (e.g. "vitamins").
- "title" should be short and shopper-friendly (max ~80 chars), based on visible branding/product type.
- "description" is 1-3 sentences: condition, storage if obvious, and that the seller confirms seals/dates separately. Do not claim food safety.
${expiryRules}
${
  hasSeal
    ? `- "seal": assess whether the SEAL image (after product) shows an unopened factory seal vs clearly opened/used. "appearsFactorySealed" is your best visual guess, not a guarantee.`
    : '- Omit the seal field or set seal to null (no seal image was provided).'
}

JSON schema:
{
  "title": string | null,
  "category": string | null,
  "customCategory": string | null,
  "description": string | null,
  "packageDate": string | null,
  "packageDateKind": string | null,
  "packageDateLabel": string | null,
  "rawTextFromExpiryPhoto": string | null,
  "seal": null | {
    "appearsFactorySealed": boolean,
    "confidence": "high" | "medium" | "low",
    "notes": string
  }
}`;

  try {
    const productPart = await fileToBase64Part(params.product);
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: systemPrompt }, { text: "Image 1 — PRODUCT:" }, productPart];

    if (params.seal) {
      parts.push({
        text: "Image 2 — SEAL:",
      });
      parts.push(await fileToBase64Part(params.seal));
    }

    if (params.expiry) {
      parts.push({
        text: `Image ${params.seal ? 3 : 2} — EXPIRY / PACKAGE DATE:`,
      });
      parts.push(await fileToBase64Part(params.expiry));
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    const raw = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const msg =
        typeof raw.error === "object" &&
        raw.error !== null &&
        "message" in raw.error &&
        typeof (raw.error as { message?: string }).message === "string"
          ? (raw.error as { message: string }).message
          : `Gemini request failed (${res.status})`;
      return { status: "unavailable", reason: msg };
    }

    const text =
      extractGeminiText(raw) ||
      (typeof raw.text === "string" ? raw.text : null);

    if (!text) {
      return {
        status: "unavailable",
        reason: "Gemini returned no text. Try again or fill the form manually.",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        status: "unavailable",
        reason: "Gemini returned non-JSON. Try again.",
      };
    }

    const decoded = responseSchema.safeParse(parsed);
    if (!decoded.success) {
      return {
        status: "unavailable",
        reason: "Could not parse Gemini JSON. Fill fields manually.",
      };
    }

    const d = decoded.data;
    const category = normalizeCategory(d.category ?? undefined);

    const rawPd = d.packageDate?.trim();
    const packageDate =
      rawPd && parsePackageDateInput(rawPd) ? rawPd : null;
    const packageDateKind = normalizePackageDateKind(d.packageDateKind ?? undefined);
    const packageDateLabel = d.packageDateLabel?.trim() || null;
    const rawTextFromExpiryPhoto = d.rawTextFromExpiryPhoto?.trim() || null;

    const product: GeminiProductAutofill = {
      title: d.title?.trim() || null,
      category,
      customCategory: d.customCategory?.trim() || null,
      description: d.description?.trim() || null,
      packageDate,
      packageDateKind,
      packageDateLabel,
      rawTextFromExpiryPhoto,
    };

    let seal: GeminiSealAssessment | null = null;
    if (hasSeal && d.seal) {
      seal = {
        appearsFactorySealed: d.seal.appearsFactorySealed,
        confidence: d.seal.confidence,
        notes: d.seal.notes.trim(),
      };
    }

    return {
      status: "succeeded",
      product,
      seal,
      rawModelText: text,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed.";
    return { status: "unavailable", reason: message };
  }
}

function extractGeminiText(raw: Record<string, unknown>): string | null {
  const candidates = raw.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const candidate = candidates[0] as Record<string, unknown>;
  const content = candidate.content as { parts?: Array<{ text?: string }> } | undefined;
  const textParts = content?.parts?.map((p) => p.text).filter(Boolean) ?? [];
  return textParts.join("\n").trim() || null;
}
