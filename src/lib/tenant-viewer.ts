import type { Session } from "next-auth";

import type { TenantViewer } from "@/lib/tenant-scope";

export function sessionToTenantViewer(session: Session | null): TenantViewer | null {
  if (!session?.user?.id) return null;
  return {
    role: session.user.role,
    clinicId: session.user.clinicId ?? null,
    providerId: session.user.providerId ?? null,
    providerType: session.user.providerType ?? null,
    category: session.user.category ?? null,
  };
}
