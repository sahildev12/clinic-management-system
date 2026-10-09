"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import {
  AdminDataTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { AdminMetaCell } from "@/components/admin/table/AdminMetaCell";
import { AdminRowActions } from "@/components/admin/table/AdminRowActions";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toDatePayload } from "@/components/ui/date-time-picker-field";
import { Label } from "@/components/ui/label";
import {
  EXPENSE_CATEGORY_OPTIONS,
  expenseCategoryLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFinanceRangeLabel,
  formatTime,
  parseFinanceDateKey,
  paymentMethodLabel,
} from "@/lib/admin-format";
import { adminPrimaryButtonClassName, adminSecondaryButtonClassName } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number | string;
  vendor?: string | null;
  method: string;
  paidAt: string | Date;
  notes?: string | null;
  voidedAt?: string | Date | null;
  voidReason?: string | null;
};

export type FinanceSummary = {
  from: string;
  to: string;
  revenue: number;
  revenueCount: number;
  expenses: number;
  expenseCount: number;
  profit: number;
};

type Props = {
  expenses: ExpenseRow[];
  summary: FinanceSummary;
  total: number;
  page: number;
  pageSize: number;
  from: string;
  to: string;
  hasActiveFilters?: boolean;
};

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight tabular-nums",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-600",
          tone === "neutral" && "text-[#1a1a1a]"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#6b7177]">{hint}</p> : null}
    </div>
  );
}

function profitTone(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function FinanceDateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState<Date | undefined>(
    () => parseFinanceDateKey(from) ?? undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(() => parseFinanceDateKey(to) ?? undefined);

  const paramsKey = `${searchParams.get("from") ?? ""}|${searchParams.get("to") ?? ""}`;
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey);
    setFromDate(parseFinanceDateKey(from) ?? undefined);
    setToDate(parseFinanceDateKey(to) ?? undefined);
  }

  function pushRange(nextFrom?: Date, nextTo?: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (nextFrom) params.set("from", toDatePayload(nextFrom));
    else params.delete("from");

    if (nextTo) params.set("to", toDatePayload(nextTo));
    else params.delete("to");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-end justify-end gap-3">
      <div className="flex w-full min-w-[148px] flex-col gap-1.5 sm:w-[168px]">
        <Label htmlFor="finance-from" className="text-xs text-[#6b7177]">
          From
        </Label>
        <DatePickerField
          id="finance-from"
          value={fromDate}
          onChange={(value) => {
            setFromDate(value);
            pushRange(value, toDate);
          }}
          placeholder="Select date"
          className="h-10 rounded-lg border-[#e3e3e3] bg-white"
          disabled={pending}
        />
      </div>
      <div className="flex w-full min-w-[148px] flex-col gap-1.5 sm:w-[168px]">
        <Label htmlFor="finance-to" className="text-xs text-[#6b7177]">
          To
        </Label>
        <DatePickerField
          id="finance-to"
          value={toDate}
          onChange={(value) => {
            setToDate(value);
            pushRange(fromDate, value);
          }}
          placeholder="Select date"
          className="h-10 rounded-lg border-[#e3e3e3] bg-white"
          disabled={pending}
        />
      </div>
    </div>
  );
}

export function FinanceManager({
  expenses,
  summary,
  total,
  page,
  pageSize,
  from,
  to,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("new") === "1";
  const [createOpen, setCreateOpen] = useState(createRequested);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [viewing, setViewing] = useState<ExpenseRow | null>(null);

  useEffect(() => {
    if (!createRequested) return;
    router.replace("/admin/finance", { scroll: false });
  }, [createRequested, router]);

  function handleSuccess() {
    setCreateOpen(false);
    setEditing(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("method");
    params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/finance?${qs}` : "/admin/finance");
    router.refresh();
  }

  const resetHref =
    from && to ? `/admin/finance?from=${from}&to=${to}` : "/admin/finance";
  const hiddenByFilters =
    hasActiveFilters && expenses.length === 0 && summary.expenseCount > 0;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader
        title="Finance"
        description="Track clinic revenue, expenses, and profit."
        action={
          <Suspense fallback={<div className="h-16 w-[360px] rounded-lg border border-[#e3e3e3] bg-white" />}>
            <FinanceDateRangeFilter from={from} to={to} />
          </Suspense>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Revenue"
          value={formatCurrency(summary.revenue)}
          hint={`${summary.revenueCount} payment${summary.revenueCount === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(summary.expenses)}
          hint={`${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Profit"
          value={formatCurrency(summary.profit)}
          hint="Revenue minus expenses"
          tone={profitTone(summary.profit)}
        />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#e3e3e3] bg-[#fafafa] px-4 py-3 text-sm text-[#4b5563]">
        {summary.profit >= 0 ? (
          <ArrowUpRight className="size-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <ArrowDownRight className="size-4 shrink-0 text-red-600" aria-hidden />
        )}
        <span>
          For <strong>{formatFinanceRangeLabel(summary.from, summary.to)}</strong>, net position is{" "}
          <strong className={cn(profitTone(summary.profit) === "negative" && "text-red-600")}>
            {formatCurrency(summary.profit)}
          </strong>
          {" "}after {formatCurrency(summary.expenses)} in expenses against{" "}
          {formatCurrency(summary.revenue)} collected.
        </span>
      </div>

      <Suspense fallback={<div className="mb-4 h-14 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref={resetHref}
          searchPlaceholder="Search title, vendor, or notes…"
          selects={[
            {
              key: "category",
              placeholder: "Select category",
              emptyLabel: "All categories",
              widthClassName: "sm:w-[220px]",
              options: EXPENSE_CATEGORY_OPTIONS,
            },
            {
              key: "method",
              placeholder: "Select payment method",
              emptyLabel: "All payment methods",
              widthClassName: "sm:w-[220px]",
              options: [
                { value: "CASH", label: "Cash" },
                { value: "ONLINE", label: "Online" },
              ],
            },
          ]}
          action={
            <button
              type="button"
              className={adminPrimaryButtonClassName()}
              onClick={() => setCreateOpen(true)}
            >
              Record expense
            </button>
          }
        />
      </Suspense>

      {expenses.length === 0 ? (
        <AdminEmptyState
          title={
            hiddenByFilters
              ? "Expenses hidden by filters"
              : hasActiveFilters
                ? "No matching expenses"
                : "No expenses yet"
          }
          description={
            hiddenByFilters
              ? `${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"} exist in this date range. Clear the category or search filters to see them all.`
              : hasActiveFilters
                ? "Try clearing filters or adjusting your search."
                : "Record rent, supplies, salaries, and other clinic costs."
          }
          actionLabel={hiddenByFilters || hasActiveFilters ? undefined : "Record expense"}
          onAction={
            hiddenByFilters || hasActiveFilters ? undefined : () => setCreateOpen(true)
          }
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Expense</AdminTh>
              <AdminTh>Category</AdminTh>
              <AdminTh>Amount</AdminTh>
              <AdminTh>Method</AdminTh>
              <AdminTh>Paid at</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {expenses.map((expense) => (
                <AdminTr key={expense.id}>
                  <AdminTd>
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{expense.title}</p>
                      {expense.vendor ? (
                        <p className="text-xs text-[#6b7177]">{expense.vendor}</p>
                      ) : null}
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <AdminMetaCell icon={TrendingUp} label={expenseCategoryLabel(expense.category)} />
                  </AdminTd>
                  <AdminTd className="font-semibold tabular-nums">
                    {formatCurrency(Number(expense.amount))}
                    {expense.voidedAt ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Voided
                      </span>
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    <AdminMetaCell icon={Banknote} label={paymentMethodLabel(expense.method)} />
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7177]">
                        <CalendarDays className="size-3.5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{formatDate(expense.paidAt)}</p>
                        <p className="text-xs text-[#6b7177]">{formatTime(expense.paidAt)}</p>
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd className="text-right">
                    <AdminRowActions
                      onView={() => setViewing(expense)}
                      onEdit={expense.voidedAt ? undefined : () => setEditing(expense)}
                      deleteEndpoint={expense.voidedAt ? undefined : `/api/admin/expenses/${expense.id}`}
                      deleteConfirmTitle="Void expense?"
                      deleteConfirm="The expense will be marked as voided and excluded from profit calculations. This can't be undone from the UI."
                      deleteConfirmLabel="Void"
                      deleteSuccessMessage="Expense voided"
                    />
                  </AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminDataTable>
          <Suspense>
            <AdminTablePagination total={total} page={page} pageSize={pageSize} />
          </Suspense>
        </AdminTableCard>
      )}

      <AdminFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Record expense"
        description="Log a clinic cost such as rent, supplies, or salaries."
      >
        <ExpenseForm
          key={createOpen ? "create" : "create-closed"}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setCreateOpen(false)}
        />
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit expense"
      >
        {editing ? (
          <ExpenseForm
            key={editing.id}
            expense={editing}
            embedded
            onSuccess={handleSuccess}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        title="Expense details"
      >
        {viewing ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Title</p>
              <p className="font-semibold text-[#111827]">{viewing.title}</p>
              {viewing.vendor ? (
                <p className="text-xs text-[#9ca3af]">{viewing.vendor}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Amount</p>
              <p className="font-semibold">{formatCurrency(Number(viewing.amount))}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Category</p>
              <p>{expenseCategoryLabel(viewing.category)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Method</p>
              <div className="mt-1">
                <AdminStatusPill status={viewing.method} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Paid at</p>
              <p>{formatDateTime(viewing.paidAt)}</p>
            </div>
            {viewing.voidedAt ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Void reason</p>
                <p className="text-red-600">{viewing.voidReason?.trim() || "Voided"}</p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap text-[#4b5563]">{viewing.notes?.trim() || "—"}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={adminSecondaryButtonClassName()}
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              {!viewing.voidedAt ? (
                <button
                  type="button"
                  className={adminPrimaryButtonClassName()}
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminFormDialog>
    </div>
  );
}
