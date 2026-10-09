"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

export type AppointmentNoteRow = {
  id: string;
  dateTime: string | Date;
  status: string;
  notes: string | null;
  patient: { name: string; phone: string; patientReference?: string };
};

type Props = {
  appointments: AppointmentNoteRow[];
  total: number;
  page: number;
  pageSize: number;
  hasActiveFilters?: boolean;
};

export function AppointmentNotesManager({
  appointments,
  total,
  page,
  pageSize,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(row: AppointmentNoteRow) {
    setEditingId(row.id);
    setDraft(row.notes ?? "");
  }

  async function saveNotes(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/appointments/${id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: draft }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save notes");
      return;
    }

    toast.success("Notes saved");
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader
        title="Notes"
        description="Appointment notes for your patients. Add clinical or follow-up notes tied to each visit."
      />

      <Suspense fallback={<div className="mb-4 h-24 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/notes"
          searchPlaceholder="Search patient or note text…"
          selects={[
            {
              key: "filter",
              placeholder: "Filter",
              emptyLabel: "All appointments",
              widthClassName: "sm:w-[180px]",
              options: [
                { value: "with-notes", label: "With notes" },
                { value: "without-notes", label: "Without notes" },
              ],
            },
          ]}
        />
      </Suspense>

      {appointments.length === 0 ? (
        <AdminEmptyState
          title={hasActiveFilters ? "No matching appointments" : "No appointments yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Notes you add to appointments will appear here."
          }
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Patient</AdminTh>
              <AdminTh>When</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Notes</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {appointments.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <AdminTr key={row.id}>
                    <AdminTd>
                      <AdminPersonCell
                        name={row.patient.name}
                        subtitle={
                          row.patient.patientReference
                            ? `#${row.patient.patientReference}`
                            : undefined
                        }
                      />
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-[#4b5563]">
                      <p>{formatDate(row.dateTime)}</p>
                      <p className="text-xs text-[#6b7177]">{formatTime(row.dateTime)}</p>
                    </AdminTd>
                    <AdminTd>
                      <AdminStatusPill status={row.status} />
                    </AdminTd>
                    <AdminTd className="min-w-[280px]">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${row.id}`} className="sr-only">
                            Notes
                          </Label>
                          <Textarea
                            id={`notes-${row.id}`}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            rows={3}
                            placeholder="Add appointment notes…"
                            className="min-h-[72px] resize-y text-sm"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-[#4b5563]">
                          {row.notes?.trim() ? row.notes : "—"}
                        </p>
                      )}
                    </AdminTd>
                    <AdminTd className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className={adminPrimaryButtonClassName("h-8 px-3 text-xs")}
                            onClick={() => void saveNotes(row.id)}
                            disabled={saving}
                          >
                            {saving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => startEdit(row)}>
                          {row.notes?.trim() ? "Edit notes" : "Add notes"}
                        </Button>
                      )}
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
      )}
    </div>
  );
}
