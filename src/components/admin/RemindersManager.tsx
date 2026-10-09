"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReminderForm } from "@/components/admin/ReminderForm";
import { ReminderStatusButton } from "@/components/admin/ReminderStatusButton";
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
import { AdminRowActions } from "@/components/admin/table/AdminRowActions";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { formatDateTime } from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

type ReminderRow = {
  id: string;
  dueAt: string | Date;
  message: string;
  status: string;
  patient: { name: string; phone: string };
};

type Option = { id: string; name: string; phone: string; patientReference?: string };
type AppointmentOption = { id: string; dateTime: string | Date; patientId: string };

type Props = {
  reminders: ReminderRow[];
  patients: Option[];
  appointments: AppointmentOption[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function RemindersManager({
  reminders,
  patients,
  appointments,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader title="Reminders" description="Manual follow-up reminders." />

      <Suspense fallback={<div className="mb-4 h-24 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/reminders"
          searchPlaceholder="Search patient or message…"
          selects={[
            {
              key: "status",
              placeholder: "Select status",
              emptyLabel: "All status",
              widthClassName: "sm:w-[150px]",
              options: [
                { value: "PENDING", label: "Pending" },
                { value: "DONE", label: "Done" },
              ],
            },
          ]}
          action={
            <button
              type="button"
              className={adminPrimaryButtonClassName()}
              onClick={() => setOpen(true)}
            >
              New reminder
            </button>
          }
        />
      </Suspense>

      {reminders.length === 0 ? (
        <AdminEmptyState
          title={hasActiveFilters ? "No matching reminders" : "No reminders"}
          description={
            hasActiveFilters
              ? "Try clearing filters or adjusting your search."
              : "Create manual reminders for patient follow-ups."
          }
          actionLabel={hasActiveFilters ? undefined : "New reminder"}
          onAction={hasActiveFilters ? undefined : () => setOpen(true)}
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Patient</AdminTh>
              <AdminTh>Due</AdminTh>
              <AdminTh>Message</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {reminders.map((reminder) => (
                <AdminTr key={reminder.id}>
                  <AdminTd>
                    <AdminPersonCell
                      name={reminder.patient.name}
                      subtitle={reminder.patient.phone}
                    />
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap text-[#4b5563]">
                    {formatDateTime(reminder.dueAt)}
                  </AdminTd>
                  <AdminTd className="max-w-xs truncate text-[#4b5563]">{reminder.message}</AdminTd>
                  <AdminTd>
                    <AdminStatusPill status={reminder.status} />
                  </AdminTd>
                  <AdminTd>
                    <div className="flex items-center justify-end gap-1.5">
                      <ReminderStatusButton id={reminder.id} status={reminder.status} />
                      <AdminRowActions deleteEndpoint={`/api/admin/reminders/${reminder.id}`} />
                    </div>
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

      <AdminFormDialog open={open} onOpenChange={setOpen} title="New reminder">
        <ReminderForm
          key={open ? "open" : "closed"}
          patients={patients}
          appointments={appointments}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </AdminFormDialog>
    </div>
  );
}
