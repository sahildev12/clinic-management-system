"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/FieldError";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import {
  DOCTOR_CATEGORY_OPTIONS,
  DEFAULT_DOCTOR_MODULES,
} from "@/lib/doctor-categories";
import {
  hasProviderFormErrors,
  validateProviderForm,
  type ProviderFormFieldErrors,
} from "@/lib/provider-form-validation";
import {
  sanitizeIndiaMobileDigits,
  toIndiaE164,
  toIndiaMobileLocalDigits,
} from "@/lib/phone";
import {
  DEFAULT_STAFF_MODULES,
  STAFF_MODULE_OPTIONS,
  type StaffModuleKey,
  sanitizeStaffModules,
} from "@/lib/staff-modules";
import { cn } from "@/lib/utils";

type Provider = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  providerType?: "DOCTOR" | "STAFF" | null;
  category?: string | null;
  moduleAccess?: string[] | null;
};

const inputErrorClass = "border-destructive ring-3 ring-destructive/20";

export function ProviderForm({
  provider,
  embedded,
  onSuccess,
  onCancel,
}: { provider?: Provider | null } & FormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(provider?.id);
  const [name, setName] = useState(provider?.name ?? "");
  const [phone, setPhone] = useState(() =>
    provider?.phone ? toIndiaMobileLocalDigits(provider.phone) : ""
  );
  const [email, setEmail] = useState(provider?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(provider?.avatarUrl ?? "");
  const [active, setActive] = useState(provider?.active ?? true);
  const [providerType, setProviderType] = useState<"DOCTOR" | "STAFF">(
    provider?.providerType === "DOCTOR" ? "DOCTOR" : "STAFF"
  );
  const [category, setCategory] = useState(provider?.category ?? "GENERAL_DENTISTRY");
  const [moduleAccess, setModuleAccess] = useState<StaffModuleKey[]>(() => {
    const existing = sanitizeStaffModules(provider?.moduleAccess);
    if (existing.length) return existing;
    if (isEdit) return [];
    return providerType === "DOCTOR" ? [...DEFAULT_DOCTOR_MODULES] : [...DEFAULT_STAFF_MODULES];
  });
  const [errors, setErrors] = useState<ProviderFormFieldErrors>({});

  const loginPath = providerType === "DOCTOR" ? "/doctor/login" : "/team/login";

  function clearError(field: keyof ProviderFormFieldErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function toggleModule(key: StaffModuleKey, checked: boolean) {
    setModuleAccess((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((k) => k !== key);
    });
    clearError("moduleAccess");
  }

  function onProviderTypeChange(next: "DOCTOR" | "STAFF") {
    setProviderType(next);
    clearError("category");
    if (!isEdit && moduleAccess.length === 0) {
      setModuleAccess(next === "DOCTOR" ? [...DEFAULT_DOCTOR_MODULES] : [...DEFAULT_STAFF_MODULES]);
    }
  }

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/team");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors = validateProviderForm({
      name,
      phone,
      email,
      password,
      providerType,
      category,
      moduleAccess,
      active,
      isEdit,
    });

    if (hasProviderFormErrors(nextErrors)) {
      setErrors(nextErrors);
      toast.error(
        nextErrors.name ??
          nextErrors.phone ??
          nextErrors.email ??
          nextErrors.password ??
          nextErrors.category ??
          nextErrors.moduleAccess ??
          "Please fix the form errors"
      );
      return;
    }

    setSaving(true);
    setErrors({});
    const payload = {
      name: name.trim(),
      phone: toIndiaE164(phone),
      email: email.trim().toLowerCase(),
      avatarUrl,
      active,
      providerType,
      category: providerType === "DOCTOR" ? category : null,
      moduleAccess,
      ...(password.trim() ? { password: password.trim() } : isEdit ? {} : { password }),
    };

    const res = await fetch(
      isEdit ? `/api/admin/providers/${provider!.id}` : "/api/admin/providers",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save member");
      return;
    }
    toast.success(isEdit ? "Member updated" : "Member added");
    finish();
  }

  return (
    <form onSubmit={onSubmit} noValidate className={formShellClassName(embedded)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <MediaPicker
            value={avatarUrl}
            onChange={setAvatarUrl}
            acceptType="IMAGE"
            label="Profile picture"
            helpText="Optional. Shown next to the member name in Team."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Member type</Label>
          <AppSelect
            value={providerType}
            onValueChange={(value) => onProviderTypeChange(value as "DOCTOR" | "STAFF")}
            options={[
              { value: "STAFF", label: "Staff (reception)" },
              { value: "DOCTOR", label: "Doctor" },
            ]}
          />
        </div>
        {providerType === "DOCTOR" ? (
          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <AppSelect
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                clearError("category");
              }}
              options={DOCTOR_CATEGORY_OPTIONS}
            />
            <FieldError message={errors.category} />
          </div>
        ) : (
          <div className="hidden sm:block" aria-hidden />
        )}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            aria-invalid={Boolean(errors.name)}
            className={cn(errors.name && inputErrorClass)}
          />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            required
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => {
              setPhone(sanitizeIndiaMobileDigits(e.target.value));
              clearError("phone");
            }}
            aria-invalid={Boolean(errors.phone)}
            className={cn(errors.phone && inputErrorClass)}
          />
          <FieldError message={errors.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@clinic.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            aria-invalid={Boolean(errors.email)}
            className={cn(errors.email && inputErrorClass)}
          />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="password">{isEdit ? "Password (optional)" : "Password"}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required={!isEdit}
              autoComplete="new-password"
              placeholder={isEdit ? "Leave blank to keep current password" : "At least 6 characters"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
              }}
              aria-invalid={Boolean(errors.password)}
              className={cn("pr-10", errors.password && inputErrorClass)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6b7177] hover:text-[#1a1a1a]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FieldError message={errors.password} />
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? `Leave blank to keep the current login password. Sign in at ${loginPath}.`
              : `Used to sign in at ${loginPath} (created by admin only).`}
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Module access</Label>
          <p className="text-xs text-muted-foreground">
            Choose which admin sections this member can open. Team and Settings stay admin-only.
          </p>
          <div
            className={cn(
              "grid gap-2 rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3 sm:grid-cols-2",
              errors.moduleAccess && "border-destructive ring-3 ring-destructive/20"
            )}
          >
            {STAFF_MODULE_OPTIONS.map((mod) => {
              const checked = moduleAccess.includes(mod.key);
              return (
                <label
                  key={mod.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleModule(mod.key, Boolean(value))}
                  />
                  {mod.label}
                </label>
              );
            })}
          </div>
          <FieldError message={errors.moduleAccess} />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="active"
            checked={active}
            onCheckedChange={(value) => {
              setActive(Boolean(value));
              clearError("moduleAccess");
            }}
          />
          <Label htmlFor="active">Active (can sign in and be assigned to appointments)</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update member" : "Add member"}
        </Button>
      </div>
    </form>
  );
}
