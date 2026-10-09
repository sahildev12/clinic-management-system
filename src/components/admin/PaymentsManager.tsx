"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, CalendarDays, FileText, Printer } from "lucide-react";
import { toast } from "sonner";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PaymentForm } from "@/components/admin/PaymentForm";
import {
  AdminDataTable,
  AdminPersonCell,
  AdminTableBody,
  AdminTableCard,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { AdminBulkBar } from "@/components/admin/table/AdminBulkBar";
import { AdminMetaCell } from "@/components/admin/table/AdminMetaCell";
import { AdminRowActions } from "@/components/admin/table/AdminRowActions";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export type PaymentRow = {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  amount: number | string;
  method: string;
  paidAt: string | Date;
  notes?: string | null;
  receiptNumber?: string | null;
  voidedAt?: string | Date | null;
  voidReason?: string | null;
  patient: { name: string; phone: string; patientReference?: string };
  appointment?: { id: string; dateTime: string | Date } | null;
};

type Option = { id: string; name: string; phone: string; patientReference?: string };
type AppointmentOption = { id: string; dateTime: string | Date; patientId: string };

type Props = {
  payments: PaymentRow[];
  patients: Option[];
  appointments: AppointmentOption[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function PaymentsManager({
  payments,
  patients,
  appointments,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("new") === "1";
  const [createOpen, setCreateOpen] = useState(createRequested);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [viewing, setViewing] = useState<PaymentRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const paymentKey = payments.map((payment) => payment.id).join(",");
  const [prevPaymentKey, setPrevPaymentKey] = useState(paymentKey);
  if (paymentKey !== prevPaymentKey) {
    setPrevPaymentKey(paymentKey);
    setSelected(new Set());
  }

  const pageIds = useMemo(() => payments.map((p) => p.id), [payments]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));

  useEffect(() => {
    if (!createRequested) return;
    router.replace("/admin/payments", { scroll: false });
  }, [createRequested, router]);

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSuccess() {
    setCreateOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const res = await fetch("/api/admin/payments/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBulkDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not void payments");
      return;
    }
    toast.success(`Voided ${ids.length} payment(s)`);
    setBulkConfirmOpen(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader
        title="Payments"
        description="Track receipts, invoices, and payment methods."
      />

      <Suspense fallback={<div className="mb-4 h-14 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/payments"
          searchPlaceholder="Search patient or notes…"
          selects={[
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
              Record payment
            </button>
          }
        />
      </Suspense>

      {payments.length === 0 ? (
        <AdminEmptyState
          title={hasActiveFilters ? "No matching payments" : "No payments yet"}
          description={
            hasActiveFilters
              ? "Try clearing filters or adjusting your search."
              : "Record cash or online payments against patients."
          }
          actionLabel={hasActiveFilters ? undefined : "Record payment"}
          onAction={hasActiveFilters ? undefined : () => setCreateOpen(true)}
        />
      ) : (
        <AdminTableCard>
          <AdminBulkBar
            count={selected.size}
            noun={selected.size === 1 ? "payment selected" : "payments selected"}
            onClear={() => setSelected(new Set())}
            onDelete={() => setBulkConfirmOpen(true)}
            deleting={bulkDeleting}
          />
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={(value) => toggleAll(value)}
                  aria-label="Select all payments"
                />
              </AdminTh>
              <AdminTh>Patient</AdminTh>
              <AdminTh>Receipt</AdminTh>
              <AdminTh>Amount</AdminTh>
              <AdminTh>Method</AdminTh>
              <AdminTh>Paid at</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {payments.map((payment) => (
                <AdminTr key={payment.id} selected={selected.has(payment.id)}>
                  <AdminTd>
                    <Checkbox
                      checked={selected.has(payment.id)}
                      onCheckedChange={(value) => toggleOne(payment.id, value)}
                      aria-label={`Select payment for ${payment.patient.name}`}
                    />
                  </AdminTd>
                  <AdminTd>
                    <AdminPersonCell name={payment.patient.name} subtitle={payment.patient.phone} />
                  </AdminTd>
                  <AdminTd>
                    {payment.receiptNumber ? (
                      <AdminMetaCell icon={FileText} label={payment.receiptNumber} />
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </AdminTd>
                  <AdminTd className="font-semibold tabular-nums">
                    {formatCurrency(Number(payment.amount))}
                    {payment.voidedAt ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Voided
                      </span>
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    <AdminMetaCell icon={Banknote} label={payment.method === "CASH" ? "Cash" : "Online"} />
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7177]">
                        <CalendarDays className="size-3.5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{formatDate(payment.paidAt)}</p>
                        <p className="text-xs text-[#6b7177]">{formatTime(payment.paidAt)}</p>
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd className="text-right">
                    <AdminRowActions
                      onView={() => setViewing(payment)}
                      onEdit={payment.voidedAt ? undefined : () => setEditing(payment)}
                      deleteEndpoint={payment.voidedAt ? undefined : `/api/admin/payments/${payment.id}`}
                      deleteConfirmTitle="Void payment?"
                      deleteConfirm="The payment will be marked as voided and excluded from collections. This can't be undone from the UI."
                      deleteConfirmLabel="Void"
                      deleteSuccessMessage="Payment voided"
                      extra={
                        <Link
                          href={`/admin/payments/${payment.id}/print`}
                          aria-label="Print receipt"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-[#6b7177] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a]"
                        >
                          <Printer className="size-4" />
                        </Link>
                      }
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
        title="Record payment"
        description="Log a payment against a patient."
      >
        <PaymentForm
          key={createOpen ? "create" : "create-closed"}
          patients={patients}
          appointments={appointments}
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
        title="Edit payment"
      >
        {editing ? (
          <PaymentForm
            key={editing.id}
            payment={editing}
            patients={patients}
            appointments={appointments}
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
        title="Payment details"
      >
        {viewing ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Patient</p>
              <p className="font-semibold text-[#111827]">{viewing.patient.name}</p>
              <p className="text-xs text-[#9ca3af]">{viewing.patient.phone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Receipt</p>
              <p className="font-semibold tabular-nums">{viewing.receiptNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Amount</p>
              <p className="font-semibold">{formatCurrency(Number(viewing.amount))}</p>
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
              <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Link
                href={`/admin/payments/${viewing.id}/print`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Print receipt
              </Link>
              {!viewing.voidedAt ? (
                <Button
                  type="button"
                  className={adminPrimaryButtonClassName("h-9")}
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                  }}
                >
                  Edit
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminFormDialog>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Void selected payments?"
        description={`This will void ${selected.size} payment(s) and exclude them from collections.`}
        confirmLabel="Void"
        loading={bulkDeleting}
        onConfirm={bulkDelete}
      />
    </div>
  );
}
