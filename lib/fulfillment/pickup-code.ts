import "server-only";

import { randomInt } from "node:crypto";

export const PICKUP_CODE_LENGTH = 6;

export function generatePickupCodeCandidate(): string {
  return String(randomInt(0, 1_000_000)).padStart(PICKUP_CODE_LENGTH, "0");
}

export function normalizePickupCodeInput(code: string): string {
  return code.replace(/\s+/g, "");
}

export function formatPickupCode(code: string | null): string | null {
  if (!code) {
    return null;
  }

  const normalized = normalizePickupCodeInput(code);
  if (normalized.length !== PICKUP_CODE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

export function getPickupCodeExpiresAt(from: Date): Date {
  const expiresAt = new Date(from);
  expiresAt.setHours(expiresAt.getHours() + 48);
  return expiresAt;
}
