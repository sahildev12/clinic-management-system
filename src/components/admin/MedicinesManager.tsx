"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MedicineForm } from "@/components/admin/MedicineForm";
import {
  AdminDataTable,
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
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

export type MedicineRow = {
  id: string;
  name: string;
  strength?: string | null;
  unit?: string | null;
  stock: number;
  notes?: string | null;
};

type Props = {
  medicines: MedicineRow[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function MedicinesManager({
  medicines,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicineRow | null>(null);

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
      <AdminPageHeader
        title="Medicines"
        description="Medicine inventory for prescriptions."
      />

      <Suspense fallback={<div className="mb-4 h-24 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/medicines"
          searchPlaceholder="Search medicines…"
          action={
            <button type="button" className={adminPrimaryButtonClassName()} onClick={openCreate}>
              Add medicine
            </button>
          }
        />
      </Suspense>

      {medicines.length === 0 ? (
        <AdminEmptyState
          title={hasActiveFilters ? "No matching medicines" : "No medicines yet"}
          description={
            hasActiveFilters
              ? "Try a different search."
              : "Add medicines to use them in prescriptions."
          }
          actionLabel={hasActiveFilters ? undefined : "Add medicine"}
          onAction={hasActiveFilters ? undefined : openCreate}
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Name</AdminTh>
              <AdminTh>Strength</AdminTh>
              <AdminTh>Unit</AdminTh>
              <AdminTh>Stock</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {medicines.map((medicine) => (
                <AdminTr key={medicine.id}>
                  <AdminTd className="font-medium text-[var(--brand-teal-dark)]">{medicine.name}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{medicine.strength ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{medicine.unit ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{medicine.stock}</AdminTd>
                  <AdminTd>
                    <AdminRowActions
                      onView={() => router.push(`/admin/medicines/${medicine.id}`)}
                      onEdit={() => {
                        setEditing(medicine);
                        setOpen(true);
                      }}
                      deleteEndpoint={`/api/admin/medicines/${medicine.id}`}
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
        onOpenChange={setOpen}
        title={editing ? "Edit medicine" : "Add medicine"}
      >
        <MedicineForm
          key={editing?.id ?? "new"}
          medicine={editing}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </AdminFormDialog>
    </div>
  );
}
