import type { ListingCategory } from "@/lib/listings/categories";
import type { PackageDateKind } from "@/lib/listings/shared";

export type GeminiProductAutofill = {
  title: string | null;
  category: ListingCategory | null;
  customCategory: string | null;
  description: string | null;
  /** yyyy-MM-dd when inferable from images and/or OCR text */
  packageDate: string | null;
  packageDateKind: PackageDateKind | null;
  packageDateLabel: string | null;
};

export type GeminiSealAssessment = {
  appearsFactorySealed: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
};

export type ListingGeminiAutofillResult =
  | {
      status: "succeeded";
      product: GeminiProductAutofill;
      seal: GeminiSealAssessment | null;
      rawModelText: string;
    }
  | {
      status: "unavailable";
      reason: string;
    };
