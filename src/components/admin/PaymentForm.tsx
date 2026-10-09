"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { DateTimePickerField, toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import { patientDisplayLabel } from "@/lib/patient-reference";

type PatientOption = { id: string; name: string; phone: string; patientReference?: string };
type AppointmentOption = { id: string; dateTime: Date | string; patientId: string };

export type PaymentFormValues = {
  id?: string;
  patientId: string;
  appointmentId?: string | null;
  amount: number | string;
  method: string;
  paidAt: Date | string;
  notes?: string | null;
};

function parseDate(value?: Date | string | null) {
  if (!value) return undefined;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function PaymentForm({
  payment,
  patients,
  appointments,
  embedded,
  onSuccess,
  onCancel,
}: {
  payment?: PaymentFormValues | null;
  patients: PatientOption[];
  appointments: AppointmentOption[];
} & FormShellProps) {
  const router = useRouter();
  const isEdit = Boolean(payment?.id);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState(payment?.patientId ?? "");
  const [appointmentId, setAppointmentId] = useState(payment?.appointmentId ?? "");
  const [amount, setAmount] = useState(
    payment?.amount != null ? String(payment.amount) : ""
  );
  const [method, setMethod] = useState(payment?.method ?? "CASH");
  const [paidAt, setPaidAt] = useState<Date | undefined>(
    parseDate(payment?.paidAt) ?? new Date()
  );
  const [notes, setNotes] = useState(payment?.notes ?? "");

  const filteredAppointments = useMemo(
    () => appointments.filter((a) => !patientId || a.patientId === patientId),
    [appointments, patientId]
  );

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/payments");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      patientId,
      appointmentId,
      amount: Number(amount),
      method,
      paidAt: paidAt ? toDateTimePayload(paidAt) : "",
      notes,
    };

    const res = await fetch(
      isEdit ? `/api/admin/payments/${payment!.id}` : "/api/admin/payments",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save payment");
      return;
    }
    toast.success(isEdit ? "Payment updated" : "Payment recorded");
    finish();
  }

  return (
    <form onSubmit={onSubmit} className={formShellClassName(embedded)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
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
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Appointment (optional)</Label>
          <AppSelect
            value={appointmentId ?? ""}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Method</Label>
          <AppSelect
            value={method}
            onValueChange={setMethod}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "ONLINE", label: "Online" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Paid at</Label>
          <DateTimePickerField value={paidAt} onChange={setPaidAt} placeholder="Select paid at" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={2}
            className="min-h-0 resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !patientId}>
          {saving ? "Saving…" : isEdit ? "Update payment" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
