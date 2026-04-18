export type NormalizedGeocode = {
  label: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  geocodeProvider: string;
  geocodeFeatureId?: string;
  geocodedAt: Date;
};

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

function readComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
) {
  return components?.find((component) => component.types?.includes(type));
}

export function normalizeGoogleGeocodeResult(
  result: GoogleGeocodeResult,
): NormalizedGeocode {
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Google geocoding did not return usable coordinates.");
  }

  const components = result.address_components;

  return {
    label: result.formatted_address ?? "",
    latitude,
    longitude,
    postalCode: readComponent(components, "postal_code")?.long_name,
    city:
      readComponent(components, "locality")?.long_name ??
      readComponent(components, "postal_town")?.long_name,
    state: readComponent(components, "administrative_area_level_1")?.short_name,
    countryCode: readComponent(components, "country")?.short_name?.toUpperCase(),
    geocodeProvider: "google",
    geocodeFeatureId: result.place_id,
    geocodedAt: new Date(),
  };
}
