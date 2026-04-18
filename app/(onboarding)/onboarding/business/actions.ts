"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { businessMemberships, businesses, users } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  forwardGeocode,
  isGoogleGeocodingConfigured,
} from "@/lib/geo/google";
import { businessOnboardingSchema } from "@/lib/validation/onboarding";

function pickValue(formData: FormData, key: string) {
  return formData.get(key) ?? "";
}

function slugifyStoreName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "store";
}

async function ensureUniqueBusinessSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    const existing = await db.query.businesses.findFirst({
      columns: {
        id: true,
      },
      where: (table, { eq }) => eq(table.slug, candidate),
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function completeBusinessOnboarding(formData: FormData) {
  const session = await requireSession("/signin/business");

  if (session.user.role === "consumer") {
    return {
      error:
        "This Google account already belongs to the shopper lane. Sign out and use a seller account instead.",
    };
  }

  const parsed = businessOnboardingSchema.safeParse({
    storeName: pickValue(formData, "storeName"),
    addressLine1: pickValue(formData, "addressLine1"),
    addressLine2: pickValue(formData, "addressLine2"),
    city: pickValue(formData, "city"),
    state: pickValue(formData, "state"),
    postalCode: pickValue(formData, "postalCode"),
    countryCode: pickValue(formData, "countryCode"),
    contactEmail: pickValue(formData, "contactEmail"),
    contactPhone: pickValue(formData, "contactPhone"),
    pickupHours: pickValue(formData, "pickupHours"),
    browserLatitude: pickValue(formData, "browserLatitude"),
    browserLongitude: pickValue(formData, "browserLongitude"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check the business onboarding fields and try again.",
    };
  }

  const input = parsed.data;

  const storefrontQuery = [
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.state,
    input.postalCode,
    input.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  let storefrontLocation = await forwardGeocode(storefrontQuery);

  if (!storefrontLocation) {
    if (
      typeof input.browserLatitude === "number" &&
      typeof input.browserLongitude === "number"
    ) {
      storefrontLocation = {
        label: storefrontQuery,
        latitude: input.browserLatitude,
        longitude: input.browserLongitude,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        geocodeProvider: "browser-geolocation",
        geocodedAt: new Date(),
      };
    } else if (!isGoogleGeocodingConfigured) {
      return {
        error:
          "This environment needs either browser location access or a Google geocoding key before the storefront can be saved.",
      };
    } else {
      return {
        error:
          "We could not verify that storefront address yet. Tighten the address details and try again.",
      };
    }
  }

  const slug = await ensureUniqueBusinessSlug(slugifyStoreName(input.storeName));
  const now = new Date();

  await db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({
        name: input.storeName,
        slug,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        addressLabel: storefrontQuery,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        latitude: storefrontLocation.latitude,
        longitude: storefrontLocation.longitude,
        geocodeProvider: storefrontLocation.geocodeProvider,
        geocodeFeatureId: storefrontLocation.geocodeFeatureId,
        geocodedAt: storefrontLocation.geocodedAt,
        pickupHours: input.pickupHours,
        updatedAt: now,
      })
      .returning({ id: businesses.id });

    await tx.insert(businessMemberships).values({
      businessId: business.id,
      userId: session.user.id,
      role: "owner",
      updatedAt: now,
    });

    await tx
      .update(users)
      .set({
        role: "business",
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, session.user.id));
  });

  redirect("/sell");
}
