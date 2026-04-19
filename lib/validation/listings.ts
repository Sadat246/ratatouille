import { z } from "zod";

import { listingCategoryValues } from "@/lib/listings/categories";
import { isAuctionEndBeforePackageDate } from "@/lib/listings/date-parser";
import {
  listingImageStorageProviderValues,
  packageDateKindValues,
  requiredListingImageKinds,
} from "@/lib/listings/shared";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "");

function parseMoneyToCents(value: unknown) {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().replace(/[$,\s]/g, "");

  if (normalized.length === 0) {
    return value;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return Math.round(parsed * 100);
}

function isAssetUrl(value: string) {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const listingAssetSchema = z.object({
  kind: z.enum(requiredListingImageKinds),
  url: z
    .string()
    .trim()
    .min(1, "Listing images need a usable URL.")
    .refine(isAssetUrl, "Listing images need a usable URL."),
  storageKey: z.string().trim().min(1, "Uploaded images need a storage key."),
  storageProvider: z.enum(listingImageStorageProviderValues),
  originalFilename: optionalText,
});

export const publishListingSchema = z
  .object({
    title: z.string().trim().min(2, "Add a product title."),
    description: optionalText,
    category: z.enum(listingCategoryValues, "Choose a category."),
    customCategory: optionalText,
    reservePriceCents: z.preprocess(
      parseMoneyToCents,
      z.number().int().positive("Add a reserve price."),
    ),
    buyoutPriceCents: z.preprocess(
      parseMoneyToCents,
      z.number().int().positive("Add a buyout price."),
    ),
    packageDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Confirm the package date."),
    packageDateLabel: optionalText,
    packageDateKind: z.enum(packageDateKindValues),
    ocrRawText: optionalText,
    auctionEndsAtIso: z
      .string()
      .trim()
      .min(1, "Choose when the auction should end.")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Choose a valid auction end time.",
      }),
    images: z.array(listingAssetSchema).max(3),
  })
  .superRefine((value, ctx) => {
    if (value.category === "other" && value.customCategory.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCategory"],
        message: "Add the custom category name.",
      });
    }

    if (value.buyoutPriceCents <= value.reservePriceCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buyoutPriceCents"],
        message: "Buyout has to be higher than the reserve price.",
      });
    }

    if (!isAuctionEndBeforePackageDate(value.auctionEndsAtIso, value.packageDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["auctionEndsAtIso"],
        message: "Auction end time must land before the confirmed package date.",
      });
    }
  });

export type PublishListingInput = z.infer<typeof publishListingSchema>;
