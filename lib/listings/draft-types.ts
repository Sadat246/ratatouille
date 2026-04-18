import type { ListingCategory } from "./categories";
import type {
  ListingImageStorageProvider,
  PackageDateKind,
  RequiredListingImageKind,
} from "./shared";

export type UploadedListingAsset = {
  kind: RequiredListingImageKind;
  url: string;
  storageKey: string;
  storageProvider: ListingImageStorageProvider;
  originalFilename: string;
};

export type ListingOcrResult = {
  status: "succeeded" | "manual_required" | "unavailable";
  rawText: string;
  packageDate: string;
  packageDateKind: PackageDateKind;
  packageDateLabel: string;
  reason?: string;
};

export type ListingDraftImageSnapshot = {
  kind: RequiredListingImageKind;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
  asset?: UploadedListingAsset;
  ocr?: ListingOcrResult;
};

export type ListingDraftValues = {
  title: string;
  description: string;
  category: ListingCategory;
  customCategory: string;
  reservePrice: string;
  buyoutPrice: string;
  packageDate: string;
  packageDateLabel: string;
  packageDateKind: PackageDateKind;
  ocrRawText: string;
  auctionEndsAtLocal: string;
};

export type ListingDraftSnapshot = {
  version: 1;
  businessId: string;
  updatedAt: string;
  values: ListingDraftValues;
  photos: Partial<Record<RequiredListingImageKind, ListingDraftImageSnapshot>>;
};
