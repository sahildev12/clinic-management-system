import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { StaffModuleKey } from "@/lib/staff-modules";
import { sessionToTenantViewer } from "@/lib/tenant-viewer";
import type { TenantViewer } from "@/lib/tenant-scope";
import { getStaffModuleAccessByUserId } from "@/services/clinic.service";
import type { Prisma, UserRole } from "@/generated/prisma/client";

type AuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

type AuthSuccess = {
  ok: true;
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
    };
  };
};

async function loadActiveUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
    },
  });
}

export async function requireStaff(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const user = await loadActiveUser(session.user.id);
  if (!user || user.banned) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    session: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  };
}

export async function requireAdmin(): Promise<AuthSuccess | AuthFailure> {
  const result = await requireStaff();
  if (!result.ok) return result;
  if (result.session.user.role !== "ADMIN") {
    return { ok: false, status: 403, error: "Admin access required" };
  }
  return result;
}

/** Staff need at least one of the given modules granted; admins always pass. */
export async function requireModule(
  ...allowed: [StaffModuleKey, ...StaffModuleKey[]]
): Promise<AuthSuccess | AuthFailure> {
  const result = await requireStaff();
  if (!result.ok) return result;
  if (result.session.user.role === "ADMIN") return result;

  const modules = await getStaffModuleAccessByUserId(result.session.user.id);
  if (!allowed.some((key) => modules.includes(key))) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return result;
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function getTenantViewer(): Promise<TenantViewer | undefined> {
  const session = await auth();
  return sessionToTenantViewer(session) ?? undefined;
}

export function clinicIdFromRequest(request: Request): string | undefined {
  const { searchParams } = new URL(request.url);
  return searchParams.get("clinicId")?.trim() || undefined;
}

export function tenantOptionsFromRequest(request: Request, viewer?: TenantViewer) {
  return {
    viewer,
    filterClinicId: clinicIdFromRequest(request),
  };
}

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
