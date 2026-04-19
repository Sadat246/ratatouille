/**
 * Coerce DB / JSON / RSC-serialized timestamps to Date.
 * Drizzle usually returns Date, but JSON boundaries often yield ISO strings.
 */
export function coerceDate(input: unknown): Date | null {
  if (input == null || input === "") {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function toIsoTimestamp(input: unknown): string {
  const d = coerceDate(input);
  if (!d) {
    return new Date(0).toISOString();
  }
  return d.toISOString();
}
