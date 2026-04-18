import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRequiredEnv, hasEnv } from "@/lib/env";

import type { UploadedListingAsset } from "./draft-types";
import type { RequiredListingImageKind } from "./shared";

const maxUploadSizeBytes = 4 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function getFileExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

function assertSupportedImage(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and HEIC listing images are supported.");
  }

  if (file.size > maxUploadSizeBytes) {
    throw new Error("Listing images must stay under 4MB after compression.");
  }
}

async function saveLocalAsset(
  file: File,
  kind: RequiredListingImageKind,
): Promise<UploadedListingAsset> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const monthStamp = new Date().toISOString().slice(0, 7);
  const extension = getFileExtension(file.type);
  const storageKey = path.posix.join(
    monthStamp,
    `${kind}-${randomUUID()}${extension}`,
  );
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "listings");
  const absolutePath = path.join(uploadsDir, storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    kind,
    url: `/uploads/listings/${storageKey}`,
    storageKey,
    storageProvider: "local",
    originalFilename: file.name,
  };
}

async function saveCloudinaryAsset(
  file: File,
  kind: RequiredListingImageKind,
): Promise<UploadedListingAsset> {
  const cloudName = getRequiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getRequiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = getRequiredEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "ratatouille/listings";
  const publicId = `${kind}-${randomUUID()}`;
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");
  const payload = new FormData();

  payload.set("file", file);
  payload.set("folder", folder);
  payload.set("public_id", publicId);
  payload.set("api_key", apiKey);
  payload.set("timestamp", String(timestamp));
  payload.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: payload,
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Cloudinary upload failed: ${details}`);
  }

  const result = (await response.json()) as {
    public_id: string;
    secure_url: string;
    original_filename?: string;
  };

  return {
    kind,
    url: result.secure_url,
    storageKey: result.public_id,
    storageProvider: "cloudinary",
    originalFilename: result.original_filename
      ? `${result.original_filename}${path.extname(file.name)}`
      : file.name,
  };
}

export async function storeListingImage(
  file: File,
  kind: RequiredListingImageKind,
) {
  assertSupportedImage(file);

  if (
    hasEnv(
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    )
  ) {
    return saveCloudinaryAsset(file, kind);
  }

  return saveLocalAsset(file, kind);
}
