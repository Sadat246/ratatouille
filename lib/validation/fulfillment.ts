import { z } from "zod";

import {
  normalizePickupCodeInput,
  PICKUP_CODE_ALPHABET,
  PICKUP_CODE_LENGTH,
} from "@/lib/fulfillment/pickup-code";

const optionalText = z.string().trim().max(120).optional().or(z.literal(""));

export const fulfillmentDeliveryInputSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, "Add the recipient name.")
    .max(80, "Keep the recipient name under 80 characters."),
  recipientPhone: z
    .string()
    .trim()
    .min(7, "Add the delivery phone number.")
    .max(32, "Keep the phone number under 32 characters."),
  deliveryAddressLine1: z
    .string()
    .trim()
    .min(3, "Add the delivery street address."),
  deliveryAddressLine2: optionalText,
  deliveryCity: z.string().trim().min(2, "Add the delivery city."),
  deliveryState: z.string().trim().min(2, "Add the delivery state."),
  deliveryPostalCode: z
    .string()
    .trim()
    .min(5, "Add the delivery postal code."),
  deliveryCountryCode: z.string().trim().min(2).default("US"),
  quoteId: z.string().trim().min(1).optional(),
});

export const fulfillmentPickupVerificationSchema = z.object({
  code: z
    .string()
    .transform(normalizePickupCodeInput)
    .refine(
      (code) =>
        code.length === PICKUP_CODE_LENGTH &&
        [...code].every((char) => PICKUP_CODE_ALPHABET.includes(char)),
      "Enter the 8-character pickup code.",
    ),
});

export type FulfillmentDeliveryInput = z.infer<
  typeof fulfillmentDeliveryInputSchema
>;
export type FulfillmentPickupVerificationInput = z.infer<
  typeof fulfillmentPickupVerificationSchema
>;
