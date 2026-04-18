import imageCompression from "browser-image-compression";

import type { ListingDraftImageSnapshot } from "./draft-types";
import type { RequiredListingImageKind } from "./shared";

const compressionPresets: Record<
  RequiredListingImageKind,
  {
    maxSizeMB: number;
    maxWidthOrHeight: number;
  }
> = {
  product: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
  },
  seal: {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 1600,
  },
  expiry: {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1280,
  },
};

function buildJpegName(fileName: string, kind: RequiredListingImageKind) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || kind;
  return `${baseName}.jpg`;
}

export async function optimizeListingImage(
  file: File,
  kind: RequiredListingImageKind,
) {
  const compressed = await imageCompression(file, {
    ...compressionPresets[kind],
    fileType: "image/jpeg",
    initialQuality: kind === "expiry" ? 0.86 : 0.9,
    useWebWorker: false,
  });

  return new File([compressed], buildJpegName(file.name, kind), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function createListingImagePreview(file: Blob) {
  return URL.createObjectURL(file);
}

export function restoreDraftImageFile(snapshot: ListingDraftImageSnapshot) {
  return new File([snapshot.blob], snapshot.name, {
    type: snapshot.type,
    lastModified: snapshot.lastModified,
  });
}
