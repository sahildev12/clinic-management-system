import { Suspense } from "react";

import { AppointmentNotesManager } from "@/components/admin/AppointmentNotesManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadNotesPage } from "@/controllers/admin.controller";

export const metadata = { title: "Notes" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    page?: string;
    pageSize?: string;
    clinicId?: string;
  }>;
}) {
  await requireModulePage("notes", "appointments");
  const search = await searchParams;
  const data = await loadNotesPage(search);

  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <AppointmentNotesManager
        appointments={data.appointments}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        hasActiveFilters={data.hasActiveFilters}
      />
    </Suspense>
  );
}
