import { PaymentsManager } from "@/components/admin/PaymentsManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadPaymentsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    method?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    includeVoided?: string;
    clinicId?: string;
  }>;
}) {
  await requireModulePage("payments");
  const search = await searchParams;
  const { payments, patients, appointments, total, page, pageSize } =
    await loadPaymentsPage(search);
  const hasActiveFilters = Boolean(search.q?.trim() || search.method);

  return (
    <PaymentsManager
      payments={payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      }))}
      patients={patients}
      appointments={appointments}
      total={total}
      page={page}
      pageSize={pageSize}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
