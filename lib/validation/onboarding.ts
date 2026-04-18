import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "");

const optionalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().finite().optional());

export const consumerOnboardingSchema = z
  .object({
    displayName: z.string().trim().min(2, "Add the name shoppers should see."),
    locationQuery: optionalText,
    browserLatitude: optionalNumber,
    browserLongitude: optionalNumber,
    deliveryAddressLine1: z
      .string()
      .trim()
      .min(3, "Add a delivery street address."),
    deliveryAddressLine2: optionalText,
    deliveryCity: z.string().trim().min(2, "Add a delivery city."),
    deliveryState: z.string().trim().min(2, "Add a delivery state."),
    deliveryPostalCode: z
      .string()
      .trim()
      .min(5, "Add a delivery postal code."),
    deliveryCountryCode: z.string().trim().min(2).default("US"),
  })
  .superRefine((value, ctx) => {
    const hasBrowserLocation =
      typeof value.browserLatitude === "number" &&
      typeof value.browserLongitude === "number";

    if (!hasBrowserLocation && value.locationQuery.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationQuery"],
        message: "Enter a ZIP or city, or use your current location.",
      });
    }
  });

export type ConsumerOnboardingInput = z.infer<typeof consumerOnboardingSchema>;

export const businessOnboardingSchema = z
  .object({
    storeName: z.string().trim().min(2, "Add the store name."),
    addressLine1: z.string().trim().min(3, "Add the storefront street address."),
    addressLine2: optionalText,
    city: z.string().trim().min(2, "Add the storefront city."),
    state: z.string().trim().min(2, "Add the storefront state."),
    postalCode: z.string().trim().min(5, "Add the storefront postal code."),
    countryCode: z.string().trim().min(2).default("US"),
    contactEmail: z.email("Add a valid pickup contact email."),
    contactPhone: z.string().trim().min(7, "Add a pickup contact phone."),
    pickupHours: z.string().trim().min(3, "Add the pickup or open-hours window."),
    browserLatitude: optionalNumber,
    browserLongitude: optionalNumber,
  });

export type BusinessOnboardingInput = z.infer<typeof businessOnboardingSchema>;
