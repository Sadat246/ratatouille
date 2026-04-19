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
  const raw = value.toLowerCase().trim();
  const underscored = raw.replace(/\s+/g, "_");
  const candidates = [underscored, raw.replace(/[^a-z]/g, "_")];
  for (const c of candidates) {
    if ((packageDateKindValues as readonly string[]).includes(c)) {
      return c as PackageDateKind;
    }
  }
  const aliases: Record<string, PackageDateKind> = {
    bestby: "best_by",
    best_if_used_by: "best_if_used_by",
    useby: "use_by",
    sellby: "sell_by",
    freshby: "fresh_by",
    freezeby: "freeze_by",
    expires: "expires_on",
    expireson: "expires_on",
  };
  const key = raw.replace(/[^a-z]/g, "");
  return aliases[key] ?? null;
}

/**
 * One multimodal call: product image always; seal image optional for factory-seal assessment.
 * Requires GEMINI_API_KEY in the environment.
 */
export async function runListingGeminiAutofill(params: {
  product: File;
  seal?: File;
  /** Raw Cloud Vision text from the package-date photo — helps infer printed dates. */
  ocrRawText?: string;
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

  const ocrBlock = params.ocrRawText?.trim()
    ? `

Raw OCR text from the package-date / expiry photo (may be noisy). Use it to infer:
- "packageDate" as yyyy-MM-dd if you can find a clear printed date (best-by, use-by, sell-by, Julian codes only if you can convert reliably; otherwise null).
- "packageDateKind" must be one of: ${packageDateKindValues.join(", ")} — match the wording on the label when possible, else "other".
- "packageDateLabel" short human label (e.g. "Best by") matching the print, or "" if unknown.

OCR text:
"""
${params.ocrRawText.trim()}
"""
`
    : "";

  const systemPrompt = `You help staff at a grocery surplus / food-rescue marketplace create listing drafts from photos.

Rules:
- Only output valid JSON matching the schema below. No markdown fences.
- "category" must be one of: ${listingCategoryValues.join(", ")}. Pick the best fit from the PRODUCT image (packaging, visible food type).
- If the product is clearly not in that list, use "other" and put a short phrase in customCategory (e.g. "vitamins").
- "title" should be short and shopper-friendly (max ~80 chars), based on visible branding/product type.
- "description" is 1-3 sentences: condition, storage if obvious, and that the seller confirms seals/dates separately. Do not claim food safety.
- If OCR text is provided above, prefer it for packageDate / label fields; if the product image also shows a date, they should agree — if not, prefer the clearest readable date and set confidence-implied fields honestly.
${ocrBlock}
${
  hasSeal
    ? `- "seal": assess whether the SECOND image (seal close-up) shows an unopened factory seal (plastic wrap, safety ring, intact sticker, etc.) vs clearly opened/used. "appearsFactorySealed" is your best visual guess, not a guarantee. "notes" explains what you see in plain English for store staff.`
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
    > = [{ text: systemPrompt }, productPart];

    if (params.seal) {
      parts.push({
        text: "Second image — seal / closure assessment (use for seal object only):",
      });
      parts.push(await fileToBase64Part(params.seal));
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

    const rawPackageDate = d.packageDate?.trim();
    const packageDate =
      rawPackageDate && parsePackageDateInput(rawPackageDate) ? rawPackageDate : null;
    const packageDateKind = normalizePackageDateKind(d.packageDateKind ?? undefined);
    const packageDateLabel = d.packageDateLabel?.trim() || null;

    const product: GeminiProductAutofill = {
      title: d.title?.trim() || null,
      category,
      customCategory: d.customCategory?.trim() || null,
      description: d.description?.trim() || null,
      packageDate,
      packageDateKind,
      packageDateLabel,
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
