"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appointmentSourceLabel,
  formatDate,
  formatTime,
  paymentPreferenceLabel,
} from "@/lib/admin-format";
import { doctorCategoryLabel } from "@/lib/doctor-categories";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import type { AppointmentRow } from "@/components/admin/AppointmentsManager";

type ViewerRole = {
  role: string;
  providerId?: string | null;
  providerType?: string | null;
  isDoctor: boolean;
  isAdmin: boolean;
};

function canManageAppointment(appointment: AppointmentRow, viewer: ViewerRole) {
  if (viewer.isAdmin) return true;
  if (viewer.isDoctor) {
    return appointment.providerId === viewer.providerId;
  }
  return viewer.role === "STAFF";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentRow | null;
  viewerRole: ViewerRole;
  onEdit: (appointment: AppointmentRow) => void;
  onUpdated: () => void;
};

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  viewerRole,
  onEdit,
  onUpdated,
}: Props) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(appointment?.notes ?? "");
  }, [appointment?.id, appointment?.notes]);

  if (!appointment) return null;

  const canManage = canManageAppointment(appointment, viewerRole);
  const showDoctor = !viewerRole.isDoctor;
  const endTime = new Date(
    new Date(appointment.dateTime).getTime() + (appointment.durationMinutes ?? 30) * 60_000
  );

  async function updateStatus(status: string) {
    const res = await fetch(`/api/admin/appointments/${appointment!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: appointment!.patientId,
        providerId: appointment!.providerId ?? "",
        dateTime: new Date(appointment!.dateTime).toISOString(),
        durationMinutes: appointment!.durationMinutes ?? 30,
        status,
        source: appointment!.source,
        notes: notes.trim(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not update appointment");
      return;
    }
    toast.success("Appointment updated");
    onUpdated();
    onOpenChange(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    const res = await fetch(`/api/admin/appointments/${appointment!.id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save notes");
      return;
    }

    toast.success("Notes saved");
    onUpdated();
  }

  return (
    <AdminFormDialog open={open} onOpenChange={onOpenChange} title="Appointment details">
      <div className="space-y-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-[#111827]">{appointment.patient.name}</p>
            <p className="text-xs text-muted-foreground">
              {appointment.patient.patientReference
                ? `#${appointment.patient.patientReference}`
                : "No reference"}{" "}
              · {appointment.patient.phone}
            </p>
          </div>
          <AdminStatusPill status={appointment.status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Date</p>
            <p className="font-medium text-[#111827]">{formatDate(appointment.dateTime)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Time</p>
            <p className="font-medium text-[#111827]">
              {formatTime(appointment.dateTime)} – {formatTime(endTime)}
            </p>
          </div>
          {showDoctor ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Doctor</p>
              <p className="font-medium text-[#111827]">
                {appointment.provider?.name ? `Dr. ${appointment.provider.name}` : "Unassigned"}
              </p>
            </div>
          ) : null}
          {showDoctor ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Specialization</p>
              <p className="font-medium text-[#111827]">
                {doctorCategoryLabel(appointment.provider?.category)}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Source</p>
            <p className="font-medium text-[#111827]">{appointmentSourceLabel(appointment.source)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Payment preference</p>
            <p className="font-medium text-[#111827]">
              {appointment.paymentPreference
                ? paymentPreferenceLabel(appointment.paymentPreference)
                : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-[#eef0f2] bg-[#fafafa] p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="appointment-notes" className="text-xs font-medium text-[#374151]">
              Notes
            </Label>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => void saveNotes()}
                disabled={savingNotes}
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </Button>
            ) : null}
          </div>
          {canManage ? (
            <Textarea
              id="appointment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add clinical notes, follow-up instructions, or reminders for this visit…"
              className="min-h-[96px] resize-y bg-white text-sm"
            />
          ) : (
            <p className="text-[#4b5563]">{notes.trim() ? notes : "No notes added."}</p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#eef0f2] pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link
            href={`/admin/patients/${appointment.patientId}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#e3e3e3] bg-white px-4 text-sm font-medium hover:bg-[#fafafa]"
          >
            View patient
          </Link>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(appointment);
                }}
              >
                Edit / reschedule
              </Button>
              {appointment.status !== "COMPLETED" ? (
                <Button
                  type="button"
                  className={adminPrimaryButtonClassName("h-9")}
                  onClick={() => void updateStatus("COMPLETED")}
                >
                  Mark completed
                </Button>
              ) : null}
              {appointment.status !== "CANCELLED" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => void updateStatus("CANCELLED")}
                >
                  Cancel
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </AdminFormDialog>
  );
}
