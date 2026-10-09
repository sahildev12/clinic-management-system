import { Suspense } from "react";

import { AppointmentsManager } from "@/components/admin/AppointmentsManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadAppointmentsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    source?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    clinicId?: string;
    providerId?: string;
    category?: string;
    view?: string;
    anchor?: string;
  }>;
}) {
  await requireModulePage("appointments");
  const filters = await searchParams;
  const data = await loadAppointmentsPage(filters);

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <AppointmentsManager
        appointments={data.appointments}
        patients={data.patients}
        providers={data.providers}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        viewerRole={data.viewerRole}
        filters={data.filters}
      />
    </Suspense>
  );
}
