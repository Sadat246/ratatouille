import "server-only";

import { randomBytes } from "node:crypto";

export const PICKUP_CODE_LENGTH = 8;
// No 0/1/I/O so codes are easy to read aloud and type.
export const PICKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePickupCode(): string {
  const bytes = randomBytes(PICKUP_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < PICKUP_CODE_LENGTH; i += 1) {
    out += PICKUP_CODE_ALPHABET[bytes[i]! % PICKUP_CODE_ALPHABET.length]!;
  }
  return out;
}

export function normalizePickupCodeInput(code: string): string {
  return code.replace(/[\s-]+/g, "").toUpperCase();
}

export function formatPickupCode(code: string | null): string | null {
  if (!code) {
    return null;
  }

  const normalized = normalizePickupCodeInput(code);
  if (normalized.length !== PICKUP_CODE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
}

export function getPickupCodeExpiresAt(from: Date): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(expiresAt.getHours() + 48);
  return expiresAt;
}
