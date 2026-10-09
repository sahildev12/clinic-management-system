"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PatientForm } from "@/components/admin/PatientForm";
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

export type PatientRow = {
  id: string;
  patientReference: string;
  name: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  address?: string | null;
  notes?: string | null;
  archivedAt?: string | Date | null;
  createdAt: string | Date;
};

type Props = {
  patients: PatientRow[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function PatientsManager({
  patients,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRequested = searchParams.get("new") === "1";
  const [open, setOpen] = useState(createRequested);
  const [editing, setEditing] = useState<PatientRow | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!createRequested) return;
    router.replace("/admin/patients", { scroll: false });
  }, [createRequested, router]);

  async function restorePatient(id: string) {
    setRestoringId(id);
    const res = await fetch(`/api/admin/patients/${id}/restore`, { method: "POST" });
    setRestoringId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not restore patient");
      return;
    }
    toast.success("Patient restored");
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(patient: PatientRow) {
    setEditing(patient);
    setOpen(true);
  }

  function handleSuccess() {
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  const emptyTitle = hasActiveFilters ? "No matching patients" : "No patients yet";
  const emptyDescription = hasActiveFilters
    ? "Try clearing filters or adjusting your search."
    : "Add your first patient to start booking appointments.";

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader title="Patients" description="Manage patient records." />

      <Suspense fallback={<div className="mb-4 h-14 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/patients"
          searchPlaceholder="Search name, reference, phone, email…"
          action={
            <button type="button" className={adminPrimaryButtonClassName()} onClick={openCreate}>
              Add patient
            </button>
          }
        />
      </Suspense>

      {patients.length === 0 ? (
        <AdminEmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={hasActiveFilters ? undefined : "Add patient"}
          onAction={hasActiveFilters ? undefined : openCreate}
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Patient</AdminTh>
              <AdminTh>Reference</AdminTh>
              <AdminTh>Email</AdminTh>
              <AdminTh>Gender</AdminTh>
              <AdminTh>Added</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {patients.map((patient) => (
                <AdminTr key={patient.id}>
                  <AdminTd>
                    <AdminPersonCell
                      name={patient.name}
                      subtitle={
                        patient.archivedAt
                          ? `#${patient.patientReference} · Archived`
                          : `#${patient.patientReference} · ${patient.phone}`
                      }
                    />
                  </AdminTd>
                  <AdminTd className="font-medium tabular-nums text-[#1a1a1a]">
                    {patient.patientReference}
                  </AdminTd>
                  <AdminTd className="text-[#4b5563]">{patient.email ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{patient.gender ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{formatDate(patient.createdAt)}</AdminTd>
                  <AdminTd>
                    {patient.archivedAt ? (
                      <button
                        type="button"
                        disabled={restoringId === patient.id}
                        onClick={() => restorePatient(patient.id)}
                        className="inline-flex h-8 items-center rounded-lg border border-[#e3e3e3] bg-white px-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#fafafa] disabled:opacity-50"
                      >
                        {restoringId === patient.id ? "Restoring…" : "Restore"}
                      </button>
                    ) : (
                      <AdminRowActions
                        onView={() => router.push(`/admin/patients/${patient.id}`)}
                        onEdit={() => openEdit(patient)}
                        deleteEndpoint={`/api/admin/patients/${patient.id}`}
                        deleteConfirmTitle="Archive patient?"
                        deleteConfirm="The patient will be archived. Related records stay available and you can restore later."
                        deleteConfirmLabel="Archive"
                        deleteSuccessMessage="Patient archived"
                      />
                    )}
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
        onOpenChange={setOpen}
        title={editing ? "Edit patient" : "Add patient"}
        description={editing ? editing.name : "Create a patient and optionally book their visit."}
        className="sm:max-w-xl"
      >
        <PatientForm
          key={editing?.id ?? "new"}
          patient={editing}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </AdminFormDialog>
    </div>
  );
}
