import { PrescriptionsManager } from "@/components/admin/PrescriptionsManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadPrescriptionsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Prescriptions" };

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; clinicId?: string }>;
}) {
  await requireModulePage("prescriptions");
  const search = await searchParams;
  const { prescriptions, patients, medicines, appointments, total, page, pageSize } =
    await loadPrescriptionsPage(search);
  const hasActiveFilters = Boolean(search.q?.trim());

  return (
    <PrescriptionsManager
      prescriptions={prescriptions}
      patients={patients}
      medicines={medicines}
      appointments={appointments}
      total={total}
      page={page}
      pageSize={pageSize}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
