import type { ListingCategory } from "@/lib/listings/categories";

export type GeminiProductAutofill = {
  title: string | null;
  category: ListingCategory | null;
  customCategory: string | null;
  description: string | null;
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
