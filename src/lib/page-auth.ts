import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { StaffModuleKey } from "@/lib/staff-modules";
import { staffHomePath } from "@/lib/staff-modules";
import { getStaffModuleAccessByUserId } from "@/services/clinic.service";

export type AdminPageViewer = {
  id: string;
  role: "ADMIN" | "STAFF";
  modules: StaffModuleKey[];
};

const loadViewer = cache(async (): Promise<AdminPageViewer | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, banned: true },
  });
  if (!user || user.banned) return null;
  if (user.role !== "ADMIN" && user.role !== "STAFF") return null;

  return {
    id: user.id,
    role: user.role,
    modules: user.role === "STAFF" ? await getStaffModuleAccessByUserId(user.id) : [],
  };
});

function sendStaffHome(viewer: AdminPageViewer): never {
  const home = staffHomePath(viewer.modules);
  redirect(home === "/login" ? "/team/login" : home);
}

async function requireBackOfficeViewer(): Promise<AdminPageViewer> {
  const viewer = await loadViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fadmin");
  return viewer;
}

/** ADMIN-only pages such as Team and Settings. */
export async function requireAdminPage(): Promise<AdminPageViewer> {
  const viewer = await requireBackOfficeViewer();
  if (viewer.role !== "ADMIN") sendStaffHome(viewer);
  return viewer;
}

/**
 * Pages a STAFF member may open only when at least one of the given modules is
 * granted. Runs before any data is loaded so nothing reaches the client first.
 */
export async function requireModulePage(
  ...allowed: [StaffModuleKey, ...StaffModuleKey[]]
): Promise<AdminPageViewer> {
  const viewer = await requireBackOfficeViewer();
  if (viewer.role === "ADMIN") return viewer;
  if (allowed.some((key) => viewer.modules.includes(key))) return viewer;
  sendStaffHome(viewer);
}
