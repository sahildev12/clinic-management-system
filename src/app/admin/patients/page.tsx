import { PatientsManager } from "@/components/admin/PatientsManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadPatientsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Patients" };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; includeArchived?: string; clinicId?: string }>;
}) {
  await requireModulePage("patients");
  const search = await searchParams;
  const { patients, total, page, pageSize } = await loadPatientsPage(search);
  const hasActiveFilters = Boolean(search.q?.trim());

  return (
    <PatientsManager
      patients={patients}
      total={total}
      page={page}
      pageSize={pageSize}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
