export const requiredListingImageKinds = ["product", "seal", "expiry"] as const;

export type RequiredListingImageKind = (typeof requiredListingImageKinds)[number];

export const listingImageStorageProviderValues = [
  "local",
  "cloudinary",
  "vercel_blob",
] as const;

export type ListingImageStorageProvider =
  (typeof listingImageStorageProviderValues)[number];

export const packageDateKindValues = [
  "best_by",
  "best_if_used_by",
  "use_by",
  "sell_by",
  "fresh_by",
  "freeze_by",
  "expires_on",
  "other",
] as const;

export type PackageDateKind = (typeof packageDateKindValues)[number];

export const packageDateKindLabels: Record<PackageDateKind, string> = {
  best_by: "Best by",
  best_if_used_by: "Best if used by",
  use_by: "Use by",
  sell_by: "Sell by",
  fresh_by: "Fresh by",
  freeze_by: "Freeze by",
  expires_on: "Expires on",
  other: "Other",
};
