"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { consumerProfiles, users } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  forwardGeocode,
  isGoogleGeocodingConfigured,
} from "@/lib/geo/google";
import { consumerOnboardingSchema } from "@/lib/validation/onboarding";

function pickValue(formData: FormData, key: string) {
  return formData.get(key) ?? "";
}

export async function completeConsumerOnboarding(formData: FormData) {
  const session = await requireSession("/signin/consumer");

  if (session.user.role === "business") {
    return {
      error:
        "This Google account already belongs to the seller lane. Sign out and use a shopper account instead.",
    };
  }

  const parsed = consumerOnboardingSchema.safeParse({
    displayName: pickValue(formData, "displayName"),
    locationQuery: pickValue(formData, "locationQuery"),
    browserLatitude: pickValue(formData, "browserLatitude"),
    browserLongitude: pickValue(formData, "browserLongitude"),
    deliveryAddressLine1: pickValue(formData, "deliveryAddressLine1"),
    deliveryAddressLine2: pickValue(formData, "deliveryAddressLine2"),
    deliveryCity: pickValue(formData, "deliveryCity"),
    deliveryState: pickValue(formData, "deliveryState"),
    deliveryPostalCode: pickValue(formData, "deliveryPostalCode"),
    deliveryCountryCode: pickValue(formData, "deliveryCountryCode"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check the consumer onboarding fields and try again.",
    };
  }

  const input = parsed.data;

  let location = input.locationQuery
    ? await forwardGeocode(input.locationQuery)
    : null;

  if (
    !location &&
    typeof input.browserLatitude === "number" &&
    typeof input.browserLongitude === "number"
  ) {
    location = {
      label: input.locationQuery || "Current location",
      latitude: input.browserLatitude,
      longitude: input.browserLongitude,
      countryCode: "US",
      geocodeProvider: "browser-geolocation",
      geocodedAt: new Date(),
    };
  }

  if (!location) {
    if (!isGoogleGeocodingConfigured) {
      return {
        error:
          "This environment needs either browser location access or a Google geocoding key before the shopper area can be saved.",
      };
    } else {
      return {
        error:
          "We could not verify that location. Try a tighter ZIP or city, or use your current location.",
      };
    }
  }

  const deliveryQuery = [
    input.deliveryAddressLine1,
    input.deliveryAddressLine2,
    input.deliveryCity,
    input.deliveryState,
    input.deliveryPostalCode,
    input.deliveryCountryCode,
  ]
    .filter(Boolean)
    .join(", ");

  let deliveryLocation = await forwardGeocode(deliveryQuery);

  if (!deliveryLocation) {
    if (!isGoogleGeocodingConfigured) {
      deliveryLocation = {
        label: deliveryQuery,
        latitude: location.latitude,
        longitude: location.longitude,
        city: input.deliveryCity,
        state: input.deliveryState,
        postalCode: input.deliveryPostalCode,
        countryCode: input.deliveryCountryCode,
        geocodeProvider: "manual-fallback",
        geocodedAt: new Date(),
      };
    } else {
      return {
        error:
          "We could not verify that delivery address yet. Tighten the address details and try again.",
      };
    }
  }

  const now = new Date();
  const locationLabel = input.locationQuery.trim() || "Current location";

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: input.displayName,
        role: "consumer",
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, session.user.id));

    await tx
      .insert(consumerProfiles)
      .values({
        userId: session.user.id,
        locationLabel: locationLabel,
        postalCode: input.locationQuery.trim().match(/^\d{5}(?:-\d{4})?$/)
          ? input.locationQuery.trim()
          : undefined,
        city: input.locationQuery.trim().length > 0 ? location.city : undefined,
        state: input.locationQuery.trim().length > 0 ? location.state : undefined,
        countryCode: location.countryCode ?? "US",
        latitude: location.latitude,
        longitude: location.longitude,
        geocodeProvider: location.geocodeProvider,
        geocodeFeatureId: location.geocodeFeatureId,
        geocodedAt: location.geocodedAt,
        deliveryAddressLine1: input.deliveryAddressLine1,
        deliveryAddressLine2: input.deliveryAddressLine2,
        deliveryCity: input.deliveryCity,
        deliveryState: input.deliveryState,
        deliveryPostalCode: input.deliveryPostalCode,
        deliveryCountryCode: input.deliveryCountryCode,
        deliveryLatitude: deliveryLocation.latitude,
        deliveryLongitude: deliveryLocation.longitude,
        deliveryPlaceId: deliveryLocation.geocodeFeatureId,
        deliveryGeocodeProvider: deliveryLocation.geocodeProvider,
        deliveryGeocodedAt: deliveryLocation.geocodedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: consumerProfiles.userId,
        set: {
          locationLabel: locationLabel,
          postalCode: input.locationQuery.trim().match(/^\d{5}(?:-\d{4})?$/)
            ? input.locationQuery.trim()
            : undefined,
          city: input.locationQuery.trim().length > 0 ? location.city : undefined,
          state: input.locationQuery.trim().length > 0 ? location.state : undefined,
          countryCode: location.countryCode ?? "US",
          latitude: location.latitude,
          longitude: location.longitude,
          geocodeProvider: location.geocodeProvider,
          geocodeFeatureId: location.geocodeFeatureId,
          geocodedAt: location.geocodedAt,
          deliveryAddressLine1: input.deliveryAddressLine1,
          deliveryAddressLine2: input.deliveryAddressLine2,
          deliveryCity: input.deliveryCity,
          deliveryState: input.deliveryState,
          deliveryPostalCode: input.deliveryPostalCode,
          deliveryCountryCode: input.deliveryCountryCode,
          deliveryLatitude: deliveryLocation.latitude,
          deliveryLongitude: deliveryLocation.longitude,
          deliveryPlaceId: deliveryLocation.geocodeFeatureId,
          deliveryGeocodeProvider: deliveryLocation.geocodeProvider,
          deliveryGeocodedAt: deliveryLocation.geocodedAt,
          updatedAt: now,
        },
      });
  });

  redirect("/shop");
}
