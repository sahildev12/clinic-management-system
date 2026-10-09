import type { ProviderType } from "@/generated/prisma/client";
import { isValidClinicPhone, isValidIndiaMobile, sanitizeIndiaMobileDigits } from "@/lib/phone";

export type ProviderFormFieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  category?: string;
  moduleAccess?: string;
};

export function isValidProviderEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateProviderForm(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  providerType: ProviderType;
  category: string;
  moduleAccess: string[];
  active: boolean;
  isEdit: boolean;
}): ProviderFormFieldErrors {
  const errors: ProviderFormFieldErrors = {};
  const name = input.name.trim();

  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 100) errors.name = "Name is too long";

  const phoneDigits = sanitizeIndiaMobileDigits(input.phone);
  if (!phoneDigits) errors.phone = "Phone is required";
  else if (!isValidIndiaMobile(phoneDigits)) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }

  if (!input.email.trim()) errors.email = "Email is required";
  else if (!isValidProviderEmail(input.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!input.isEdit && input.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters";
  } else if (input.isEdit && input.password.trim() && input.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (input.providerType === "DOCTOR" && !input.category) {
    errors.category = "Select a specialization";
  }

  if (input.active && input.moduleAccess.length === 0) {
    errors.moduleAccess = "Select at least one module for an active member";
  }

  return errors;
}

export function hasProviderFormErrors(errors: ProviderFormFieldErrors) {
  return Object.values(errors).some(Boolean);
}

/** Server-side phone check (accepts stored +91 formats). */
export function assertValidProviderPhone(phone: string | undefined | null) {
  const trimmed = phone?.trim();
  if (!trimmed) return "Phone is required";
  if (!isValidClinicPhone(trimmed)) return "Enter a valid 10-digit mobile number";
  return undefined;
}
