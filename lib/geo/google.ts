import "server-only";

import { getOptionalEnv } from "@/lib/env";

import {
  normalizeGoogleGeocodeResult,
  type NormalizedGeocode,
} from "./normalize";

const googleGeocodingApiKey = getOptionalEnv("GOOGLE_GEOCODING_API_KEY");

type GoogleGeocodingResponse = {
  error_message?: string;
  results?: unknown[];
  status?: string;
};

export const isGoogleGeocodingConfigured = Boolean(googleGeocodingApiKey);

async function runGoogleGeocodingRequest(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google geocoding request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as GoogleGeocodingResponse;

  if (
    payload.status &&
    payload.status !== "OK" &&
    payload.status !== "ZERO_RESULTS"
  ) {
    throw new Error(
      payload.error_message
        ? `Google geocoding failed: ${payload.error_message}`
        : `Google geocoding failed with status ${payload.status}.`,
    );
  }

  return payload;
}

export async function forwardGeocode(
  query: string,
): Promise<NormalizedGeocode | null> {
  if (!googleGeocodingApiKey) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("components", "country:US");
  url.searchParams.set("key", googleGeocodingApiKey);

  const payload = await runGoogleGeocodingRequest(url);
  const firstResult = payload.results?.[0];

  if (!firstResult) {
    return null;
  }

  return normalizeGoogleGeocodeResult(
    firstResult as Parameters<typeof normalizeGoogleGeocodeResult>[0],
  );
}
