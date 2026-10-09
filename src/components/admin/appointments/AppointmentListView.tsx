"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatTime, paymentPreferenceLabel } from "@/lib/admin-format";

export type AppointmentRow = {
  id: string;
  patientId: string;
  providerId?: string | null;
  dateTime: string | Date;
  durationMinutes?: number;
  bookingReference?: string | null;
  status: string;
  source: string;
  paymentPreference?: string | null;
  notes?: string | null;
  patient: { name: string; phone: string; patientReference?: string };
  provider?: {
    id: string;
    name: string;
    specialty?: string | null;
    category?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type Props = {
  appointments: AppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
  hideDoctorColumn?: boolean;
  onEdit: (appointment: AppointmentRow) => void;
  onRefresh: () => void;
};

export function AppointmentListView({
  appointments,
  total,
  page,
  pageSize,
  hideDoctorColumn = false,
  onEdit,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const cancelledIds = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "CANCELLED")
        .map((appointment) => appointment.id),
    [appointments]
  );
  const allCancelledSelected =
    cancelledIds.length > 0 && cancelledIds.every((id) => selected.has(id));
  const someCancelledSelected = cancelledIds.some((id) => selected.has(id));

  function toggleAllCancelled(checked: boolean) {
    setSelected(checked ? new Set(cancelledIds) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setBulkDeleting(true);
    const response = await fetch("/api/admin/appointments/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBulkDeleting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error ?? "Could not delete appointments");
      return;
    }

    toast.success(`Deleted ${ids.length} cancelled appointment(s)`);
    setBulkConfirmOpen(false);
    setSelected(new Set());
    onRefresh();
    router.refresh();
  }

  if (appointments.length === 0) {
    return (
      <AdminEmptyState
        title="No appointments in this range"
        description="Try adjusting filters or switch to another calendar view."
      />
    );
  }

  return (
    <>
      <AdminTableCard className="border-0 shadow-none">
        <AdminBulkBar
          count={selected.size}
          noun={
            selected.size === 1
              ? "cancelled appointment selected"
              : "cancelled appointments selected"
          }
          onClear={() => setSelected(new Set())}
          onDelete={() => setBulkConfirmOpen(true)}
          deleting={bulkDeleting}
        />
        <AdminDataTable>
          <AdminTableHeader>
            <AdminTh className="w-10">
              <Checkbox
                checked={allCancelledSelected}
                indeterminate={someCancelledSelected && !allCancelledSelected}
                disabled={cancelledIds.length === 0}
                onCheckedChange={toggleAllCancelled}
                aria-label="Select all cancelled appointments"
              />
            </AdminTh>
            <AdminTh>Patient</AdminTh>
            <AdminTh>When</AdminTh>
            {!hideDoctorColumn ? <AdminTh>Doctor</AdminTh> : null}
            <AdminTh>Status</AdminTh>
            <AdminTh>Payment</AdminTh>
            <AdminTh className="text-right">Actions</AdminTh>
          </AdminTableHeader>
          <AdminTableBody>
            {appointments.map((appt) => {
              const isCancelled = appt.status === "CANCELLED";
              return (
                <AdminTr key={appt.id} selected={selected.has(appt.id)}>
                  <AdminTd>
                    <Checkbox
                      checked={selected.has(appt.id)}
                      disabled={!isCancelled}
                      onCheckedChange={(checked) => toggleOne(appt.id, checked)}
                    />
                  </AdminTd>
                  <AdminTd>
                    <AdminPersonCell
                      name={appt.patient.name}
                      subtitle={
                        appt.patient.patientReference
                          ? `#${appt.patient.patientReference}`
                          : undefined
                      }
                    />
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7177]">
                        <CalendarDays className="size-3.5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{formatDate(appt.dateTime)}</p>
                        <p className="text-xs text-[#6b7177]">
                          {formatTime(appt.dateTime)}
                          {appt.durationMinutes ? ` · ${appt.durationMinutes} min` : ""}
                        </p>
                      </div>
                    </div>
                  </AdminTd>
                  {!hideDoctorColumn ? (
                    <AdminTd className="text-[#4b5563]">
                      {appt.provider?.name ? `Dr. ${appt.provider.name}` : "—"}
                    </AdminTd>
                  ) : null}
                  <AdminTd>
                    <AdminStatusPill status={appt.status} />
                  </AdminTd>
                  <AdminTd>
                    {appt.paymentPreference ? (
                      <AdminMetaCell icon={CreditCard} label={paymentPreferenceLabel(appt.paymentPreference)} />
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </AdminTd>
                  <AdminTd>
                    <AdminRowActions
                      onEdit={() => onEdit(appt)}
                      deleteEndpoint={
                        isCancelled ? `/api/admin/appointments/${appt.id}` : undefined
                      }
                      deleteConfirmTitle="Delete cancelled appointment?"
                      deleteConfirm="This cancelled appointment will be permanently deleted."
                    />
                  </AdminTd>
                </AdminTr>
              );
            })}
          </AdminTableBody>
        </AdminDataTable>
        <Suspense>
          <AdminTablePagination total={total} page={page} pageSize={pageSize} itemName="appointments" />
        </Suspense>
      </AdminTableCard>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Delete selected appointments?"
        description={`This will permanently delete ${selected.size} cancelled appointment(s).`}
        confirmLabel="Delete"
        loading={bulkDeleting}
        onConfirm={bulkDelete}
      />
    </>
  );
}
