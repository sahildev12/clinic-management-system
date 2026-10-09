"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PrescriptionForm } from "@/components/admin/PrescriptionForm";
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
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { formatDate } from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

type PrescriptionItem = {
  medicineId: string;
  dosage: string;
  duration?: string | null;
  instructions?: string | null;
  quantity?: number | null;
  medicine?: { name: string; strength?: string | null };
};

type PrescriptionRow = {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  patient: { name: string; phone: string; patientReference?: string };
  items: PrescriptionItem[];
};

type Option = {
  id: string;
  name: string;
  phone?: string;
  patientReference?: string;
  strength?: string | null;
};
type AppointmentOption = { id: string; dateTime: string | Date; patientId: string };

type Props = {
  prescriptions: PrescriptionRow[];
  patients: Option[];
  medicines: Option[];
  appointments: AppointmentOption[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function PrescriptionsManager({
  prescriptions,
  patients,
  medicines,
  appointments,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("new") === "1";
  const [open, setOpen] = useState(createRequested);
  const [editing, setEditing] = useState<PrescriptionRow | null>(null);

  useEffect(() => {
    if (!createRequested) return;
    router.replace("/admin/prescriptions", { scroll: false });
  }, [createRequested, router]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function handleSuccess() {
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader title="Prescriptions" description="Create printable prescriptions." />

      <Suspense fallback={<div className="mb-4 h-24 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/prescriptions"
          searchPlaceholder="Search patient or diagnosis…"
          action={
            <button type="button" className={adminPrimaryButtonClassName()} onClick={openCreate}>
              New prescription
            </button>
          }
        />
      </Suspense>

      {prescriptions.length === 0 ? (
        <AdminEmptyState
          title={hasActiveFilters ? "No matching prescriptions" : "No prescriptions yet"}
          description={
            hasActiveFilters
              ? "Try clearing filters or adjusting your search."
              : "Create a prescription with medicine lines, then print it."
          }
          actionLabel={hasActiveFilters ? undefined : "New prescription"}
          onAction={hasActiveFilters ? undefined : openCreate}
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Patient</AdminTh>
              <AdminTh>Diagnosis</AdminTh>
              <AdminTh>Items</AdminTh>
              <AdminTh>Date</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {prescriptions.map((rx) => (
                <AdminTr key={rx.id}>
                  <AdminTd>
                    <AdminPersonCell name={rx.patient.name} subtitle={rx.patient.phone} />
                  </AdminTd>
                  <AdminTd className="text-[#4b5563]">{rx.diagnosis ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{rx.items.length}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{formatDate(rx.createdAt)}</AdminTd>
                  <AdminTd>
                    <AdminRowActions
                      onEdit={() => {
                        setEditing(rx);
                        setOpen(true);
                      }}
                      deleteEndpoint={`/api/admin/prescriptions/${rx.id}`}
                      extra={
                        <Link
                          href={`/admin/prescriptions/${rx.id}/print`}
                          aria-label="Print"
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
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        title={editing ? "Amend prescription" : "New prescription"}
        className="sm:max-w-3xl"
      >
        <PrescriptionForm
          key={editing?.id ?? (open ? "open" : "closed")}
          prescription={editing}
          patients={patients}
          medicines={medicines}
          appointments={appointments}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </AdminFormDialog>
    </div>
  );
}
