import { auth } from "@/auth";
import { sessionToTenantViewer } from "@/lib/tenant-viewer";
import type { TenantViewer } from "@/lib/tenant-scope";
import { listClinics } from "@/services/clinic.service";

export type TenantRequestContext = {
  viewer: TenantViewer | null;
  filterClinicId?: string;
  clinics: Awaited<ReturnType<typeof listClinics>>;
};

export async function loadTenantRequestContext(search?: {
  clinicId?: string;
}): Promise<TenantRequestContext> {
  const session = await auth();
  const viewer = sessionToTenantViewer(session);
  const filterClinicId = search?.clinicId?.trim() || undefined;
  const clinics = viewer?.role === "ADMIN" ? await listClinics() : [];
  return { viewer, filterClinicId, clinics };
}

export function tenantListOptions(ctx: TenantRequestContext) {
  return {
    viewer: ctx.viewer ?? undefined,
    filterClinicId: ctx.filterClinicId,
  };
}
