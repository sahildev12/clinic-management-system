import { RemindersManager } from "@/components/admin/RemindersManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadRemindersPage } from "@/controllers/admin.controller";

export const metadata = { title: "Reminders" };

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    clinicId?: string;
  }>;
}) {
  await requireModulePage("reminders");
  const search = await searchParams;
  const { reminders, patients, appointments, total, page, pageSize } =
    await loadRemindersPage(search);
  const hasActiveFilters = Boolean(search.q?.trim() || search.status);

  return (
    <RemindersManager
      reminders={reminders}
      patients={patients}
      appointments={appointments}
      total={total}
      page={page}
      pageSize={pageSize}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
