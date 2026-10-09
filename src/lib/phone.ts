/**
 * Normalizes a phone number for storage/lookup: strips everything except
 * digits, but preserves a single leading "+" for international numbers.
 * "+91 98765 43210" -> "+919876543210", "(987) 654-3210" -> "9876543210".
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

/** Digits only, max 10 — for India mobile input without country code. */
export function sanitizeIndiaMobileDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Builds +91… payload from a 10-digit local mobile number. */
export function toIndiaE164(localDigits: string): string {
  const digits = sanitizeIndiaMobileDigits(localDigits);
  return digits ? `+91${digits}` : "";
}

export function isValidIndiaMobile(localDigits: string): boolean {
  return /^[6-9]\d{9}$/.test(sanitizeIndiaMobileDigits(localDigits));
}

/** Strip stored +91 / 0 prefix down to 10 local digits for form editing. */
export function toIndiaMobileLocalDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length >= 11) digits = digits.slice(1);
  return sanitizeIndiaMobileDigits(digits);
}

/** Accepts 10-digit India mobiles, with or without +91 / 0 prefix. */
export function isValidClinicPhone(phone: string): boolean {
  return isValidIndiaMobile(toIndiaMobileLocalDigits(phone));
}
