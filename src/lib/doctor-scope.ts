import type { Prisma } from "@/generated/prisma/client";

import type { TenantViewer } from "@/lib/tenant-scope";

export function isDoctorViewer(viewer?: TenantViewer | null) {
  return viewer?.providerType === "DOCTOR" && Boolean(viewer.providerId);
}

/** Patients linked to a doctor via non-cancelled appointments or encounters. */
export function doctorPatientWhere(providerId: string): Prisma.PatientWhereInput {
  return {
    OR: [
      { appointments: { some: { providerId, status: { not: "CANCELLED" } } } },
      { encounters: { some: { providerId } } },
    ],
  };
}

export function mergeDoctorPatientScope<W extends Prisma.PatientWhereInput>(
  where: W,
  viewer?: TenantViewer
): W {
  if (!isDoctorViewer(viewer) || !viewer?.providerId) return where;
  return { AND: [where, doctorPatientWhere(viewer.providerId)] } as W;
}

export function resolveAppointmentProviderFilter(
  viewer?: TenantViewer,
  explicitProviderId?: string | null
): string | undefined {
  if (isDoctorViewer(viewer) && viewer?.providerId) {
    return viewer.providerId;
  }
  const trimmed = explicitProviderId?.trim();
  return trimmed || undefined;
}

export function doctorAppointmentScope(providerId: string): Prisma.AppointmentWhereInput {
  return { providerId };
}

export function doctorDashboardScope(viewer?: TenantViewer): Prisma.AppointmentWhereInput {
  if (!isDoctorViewer(viewer) || !viewer?.providerId) return {};
  return doctorAppointmentScope(viewer.providerId);
}
