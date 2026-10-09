"use client";

import { getSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/FieldError";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProviderType, UserRole } from "@/generated/prisma/client";
import { hasErrors, validateLoginForm, type FieldErrors } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

type LoginField = "email" | "password";

type FormState = {
  email: string;
  password: string;
  remember: boolean;
};

const initialState: FormState = {
  email: "",
  password: "",
  remember: false,
};

const inputErrorClass = "border-destructive ring-3 ring-destructive/20";

function safeAdminCallback(raw: string | null, fallback = "/admin") {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (!raw.startsWith("/admin")) return fallback;
  // /admin/login is not an app page — land on dashboard instead
  if (raw === "/admin/login" || raw.startsWith("/admin/login?")) return fallback;
  return raw;
}

export function LoginForm({
  allowedRole,
  wrongRoleMessage,
  requiredProviderType,
  wrongProviderTypeMessage,
}: {
  allowedRole: UserRole;
  wrongRoleMessage: string;
  requiredProviderType?: ProviderType;
  wrongProviderTypeMessage?: string;
}) {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: LoginField | "remember", value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "email" || field === "password") {
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateLoginForm(form);
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (!result || result.error || result.ok === false) {
        toast.error("Invalid email or password.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;
      if (role !== allowedRole) {
        await signOut({ redirect: false });
        toast.error(wrongRoleMessage);
        return;
      }

      if (
        requiredProviderType &&
        session?.user?.providerType !== requiredProviderType
      ) {
        await signOut({ redirect: false });
        toast.error(
          wrongProviderTypeMessage ??
            (requiredProviderType === "DOCTOR"
              ? "Use the doctor login page for doctor accounts."
              : "Use the team login page for staff accounts.")
        );
        return;
      }

      const destination = safeAdminCallback(searchParams.get("callbackUrl"));
      toast.success("Welcome back!");
      window.location.assign(destination);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3.5" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium text-[var(--brand-charcoal)]">
          Email Address
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="Enter your email address"
          className={cn("h-10", errors.email && inputErrorClass)}
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
        />
        <FieldError message={errors.email} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="text-sm font-medium text-[var(--brand-charcoal)]">
          Password
        </label>
        <PasswordInput
          id="login-password"
          placeholder="Enter your password"
          className={cn(errors.password && inputErrorClass)}
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
        />
        <FieldError message={errors.password} />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={form.remember}
          onChange={(event) => update("remember", event.target.checked)}
          className="size-4 rounded border-input"
        />
        Remember me
      </label>

      <Button
        type="submit"
        disabled={submitting}
        className="h-10 w-full bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-charcoal)]"
      >
        {submitting ? "Logging in…" : "Login"}
      </Button>
    </form>
  );
}
