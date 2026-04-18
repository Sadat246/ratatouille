"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auctions, listingImages, listings, users } from "@/db/schema";
import { getPackageDateCutoff } from "@/lib/listings/date-parser";
import { getSellerMembership } from "@/lib/listings/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { publishListingSchema } from "@/lib/validation/listings";

function pickValue(formData: FormData, key: string) {
  return formData.get(key) ?? "";
}

function pickJson<T>(formData: FormData, key: string, fallback: T) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export type PublishListingActionState = {
  error?: string;
  listingId?: string;
  success?: boolean;
};

export async function publishListing(formData: FormData): Promise<PublishListingActionState> {
  const session = await requireCompletedRole("business");
  const membership = await getSellerMembership(session.user.id);

  if (!membership) {
    return {
      error: "This seller account does not have a storefront membership yet.",
    };
  }

  const parsed = publishListingSchema.safeParse({
    title: pickValue(formData, "title"),
    description: pickValue(formData, "description"),
    category: pickValue(formData, "category"),
    customCategory: pickValue(formData, "customCategory"),
    reservePriceCents: pickValue(formData, "reservePrice"),
    buyoutPriceCents: pickValue(formData, "buyoutPrice"),
    packageDate: pickValue(formData, "packageDate"),
    packageDateLabel: pickValue(formData, "packageDateLabel"),
    packageDateKind: pickValue(formData, "packageDateKind"),
    ocrRawText: pickValue(formData, "ocrRawText"),
    auctionEndsAtIso: pickValue(formData, "auctionEndsAtIso"),
    images: pickJson(formData, "images", []),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check the listing fields and try publishing again.",
    };
  }

  const input = parsed.data;
  const expiresAt = getPackageDateCutoff(input.packageDate);

  if (!expiresAt) {
    return {
      error: "Confirm the package date before publishing.",
    };
  }

  const auctionEndsAt = new Date(input.auctionEndsAtIso);
  const now = new Date();

  try {
    const [created] = await db.transaction(async (tx) => {
      const [listing] = await tx
        .insert(listings)
        .values({
          businessId: membership.businessId,
          createdByUserId: session.user.id,
          status: "active",
          title: input.title,
          description: input.description || null,
          category: input.category,
          customCategory: input.category === "other" ? input.customCategory : null,
          reservePriceCents: input.reservePriceCents,
          buyoutPriceCents: input.buyoutPriceCents,
          expiryText: input.packageDate,
          expiresAt,
          packageDateLabel: input.packageDateLabel || null,
          packageDateKind: input.packageDateKind,
          packageDateConfirmedAt: now,
          ocrStatus: input.ocrRawText ? "succeeded" : "manual_required",
          ocrRawText: input.ocrRawText || null,
          publishedAt: now,
          updatedAt: now,
        })
        .returning({ id: listings.id });

      await tx.insert(listingImages).values(
        input.images.map((image, index) => ({
          listingId: listing.id,
          kind: image.kind,
          imageUrl: image.url,
          storageProvider: image.storageProvider,
          storageKey: image.storageKey,
          originalFilename: image.originalFilename || null,
          sortOrder: index,
        })),
      );

      await tx.insert(auctions).values({
        listingId: listing.id,
        businessId: membership.businessId,
        status: "active",
        reservePriceCents: input.reservePriceCents,
        buyoutPriceCents: input.buyoutPriceCents,
        scheduledStartAt: now,
        scheduledEndAt: auctionEndsAt,
        updatedAt: now,
      });

      await tx
        .update(users)
        .set({
          updatedAt: now,
        })
        .where(eq(users.id, session.user.id));

      return [listing];
    });

    return {
      success: true,
      listingId: created.id,
    };
  } catch (error) {
    console.error("publish listing failed", error);

    return {
      error: "The listing could not be published. Try again in a moment.",
    };
  }
}
