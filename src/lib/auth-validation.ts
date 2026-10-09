export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function hasErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).some(Boolean);
}

export function validateEmail(email: string) {
  const value = email.trim();
  if (!value) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email.";
  return undefined;
}

export function validateLoginForm(values: { email: string; password: string }) {
  const errors: FieldErrors<"email" | "password"> = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  const password = values.password.trim();
  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
}
