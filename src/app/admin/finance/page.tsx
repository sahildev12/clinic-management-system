import { FinanceManager } from "@/components/admin/FinanceManager";
import { requireModulePage } from "@/lib/page-auth";
import { loadFinancePage } from "@/controllers/admin.controller";

export const metadata = { title: "Finance" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    method?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
    includeVoided?: string;
    clinicId?: string;
  }>;
}) {
  await requireModulePage("finance");
  const search = await searchParams;
  const { expenses, summary, total, page, pageSize, from, to } = await loadFinancePage(search);
  const hasActiveFilters = Boolean(
    search.q?.trim() || search.category || search.method
  );

  return (
    <FinanceManager
      expenses={expenses.map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
      }))}
      summary={summary}
      total={total}
      page={page}
      pageSize={pageSize}
      from={from}
      to={to}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
