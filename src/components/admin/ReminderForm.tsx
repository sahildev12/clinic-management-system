"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { DateTimePickerField, toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import { patientDisplayLabel } from "@/lib/patient-reference";

type PatientOption = { id: string; name: string; phone: string; patientReference?: string };
type AppointmentOption = { id: string; dateTime: Date | string; patientId: string };

function defaultDue() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export function ReminderForm({
  patients,
  appointments,
  embedded,
  onSuccess,
  onCancel,
}: {
  patients: PatientOption[];
  appointments: AppointmentOption[];
} & FormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [dueAt, setDueAt] = useState<Date | undefined>(defaultDue());
  const [message, setMessage] = useState("");

  const filteredAppointments = useMemo(
    () => appointments.filter((a) => !patientId || a.patientId === patientId),
    [appointments, patientId]
  );

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/reminders");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dueAt) {
      toast.error("Please pick due date & time");
      return;
    }
    setSaving(true);
    const payload = {
      patientId,
      appointmentId,
      dueAt: toDateTimePayload(dueAt),
      message,
      status: "PENDING",
    };

    const res = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save reminder");
      return;
    }
    toast.success("Reminder created");
    finish();
  }

  return (
    <form onSubmit={onSubmit} className={formShellClassName(embedded)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Patient</Label>
          <AppSelect
            value={patientId}
            onValueChange={(v) => {
              setPatientId(v);
              setAppointmentId("");
            }}
            placeholder="Select patient"
            options={patients.map((p) => ({
              value: p.id,
              label: patientDisplayLabel(p),
            }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Appointment (optional)</Label>
          <AppSelect
            value={appointmentId}
            onValueChange={setAppointmentId}
            allowEmpty
            emptyLabel="None"
            placeholder="None"
            options={filteredAppointments.map((a) => ({
              value: a.id,
              label: new Date(a.dateTime).toLocaleString("en-IN"),
            }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Due at</Label>
          <DateTimePickerField value={dueAt} onChange={setDueAt} placeholder="Select due time" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            required
            rows={2}
            className="min-h-0 resize-y"
            placeholder="Call patient about follow-up…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !patientId}>
          {saving ? "Saving…" : "Create reminder"}
        </Button>
      </div>
    </form>
  );
}
