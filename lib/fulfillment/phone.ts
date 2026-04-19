import "server-only";

export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    if (digits.length < 10 || digits.length > 15) {
      throw new Error("Phone number must contain between 10 and 15 digits.");
    }
    return `+${digits}`;
  }

  const digits = trimmed.replace(/[^\d]/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  throw new Error("Phone number must be a valid US number.");
}
