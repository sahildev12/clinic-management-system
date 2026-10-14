import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { NewAppointmentAlert } from "@/components/admin/NewAppointmentAlert";
import { StaffRouteGuard } from "@/components/admin/StaffRouteGuard";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { StaffModuleKey } from "@/lib/staff-modules";
import { sessionToTenantViewer } from "@/lib/tenant-viewer";
import { getClinicSettings, getStaffModuleAccessByUserId } from "@/services/clinic.service";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Clinic Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, banned: true },
  });

  if (!user || user.banned || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    redirect(user?.role === "STAFF" ? "/team/login" : "/login");
  }

  const moduleAccess: StaffModuleKey[] =
    user.role === "STAFF" ? await getStaffModuleAccessByUserId(user.id) : [];

  if (user.role === "STAFF" && moduleAccess.length === 0) {
    redirect("/team/login");
  }

  const viewer = sessionToTenantViewer(session);
  const clinicScope =
    viewer?.role === "STAFF" && viewer.clinicId ? { clinicId: viewer.clinicId } : {};
  const settingsClinicId =
    viewer?.role === "STAFF" ? viewer.clinicId ?? undefined : undefined;

  const [pendingReminderCount, unreadMessageCount, clinicSettings] = await Promise.all([
    prisma.reminder.count({ where: { status: "PENDING", ...clinicScope } }),
    prisma.contactMessage.count({ where: { read: false, ...clinicScope } }),
    getClinicSettings(settingsClinicId),
  ]);

  return (
    <AdminShell
      clinicName={clinicSettings.clinicName}
      logoUrl={clinicSettings.logoUrl}
      pendingReminderCount={pendingReminderCount}
      unreadMessageCount={unreadMessageCount}
      role={user.role}
      allowedModules={moduleAccess}
      providerType={session.user.providerType}
    >
      <AdminTopBar
        userName={user.name ?? "Admin"}
        userEmail={user.email ?? ""}
        role={user.role}
        allowedModules={moduleAccess}
        unreadMessageCount={unreadMessageCount}
        providerType={session.user.providerType}
        specialization={session.user.category}
      />
      <main className="min-h-0 w-full flex-1 overflow-y-auto p-3 md:p-4">
        <StaffRouteGuard
          role={user.role}
          modules={moduleAccess}
          providerType={session.user.providerType}
        >
          {children}
        </StaffRouteGuard>
      </main>
      <NewAppointmentAlert />
    </AdminShell>
  );
}