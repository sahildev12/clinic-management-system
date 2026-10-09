import type { Prisma } from "@/generated/prisma/client";
import type { DoctorCategory, ProviderType, UserRole } from "@/generated/prisma/client";
import { ValidationError } from "@/lib/validation";

export type TenantViewer = {
  role: UserRole;
  clinicId: string | null;
  providerId: string | null;
  providerType: ProviderType | null;
  category: DoctorCategory | null;
};

export type TenantScopeOptions = {
  filterClinicId?: string | null;
};

/** Builds a Prisma where fragment scoped to the viewer's clinic access. */
export function clinicWhere(
  viewer: TenantViewer,
  options?: TenantScopeOptions
): Prisma.PatientWhereInput {
  const filter = resolveClinicFilter(viewer, options?.filterClinicId);
  return filter ? { clinicId: filter } : {};
}

export function resolveClinicFilter(
  viewer: TenantViewer,
  filterClinicId?: string | null
): string | undefined {
  if (viewer.role === "STAFF") {
    if (!viewer.clinicId) {
      throw new ValidationError("Your account is not linked to a clinic");
    }
    if (filterClinicId && filterClinicId !== viewer.clinicId) {
      throw new ValidationError("You cannot access another clinic");
    }
    return viewer.clinicId;
  }

  const trimmed = filterClinicId?.trim();
  return trimmed || undefined;
}

export function requireClinicIdForWrite(
  viewer: TenantViewer,
  explicitClinicId?: string | null
): string {
  if (viewer.role === "STAFF") {
    if (!viewer.clinicId) {
      throw new ValidationError("Your account is not linked to a clinic");
    }
    if (explicitClinicId && explicitClinicId !== viewer.clinicId) {
      throw new ValidationError("You cannot write to another clinic");
    }
    return viewer.clinicId;
  }

  const clinicId = explicitClinicId?.trim() || viewer.clinicId?.trim();
  if (!clinicId) {
    throw new ValidationError("Select a clinic before creating records");
  }
  return clinicId;
}

export function slugifyClinicName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "clinic";
}
