"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import { patientDisplayLabel } from "@/lib/patient-reference";

type Option = {
  id: string;
  name: string;
  phone?: string;
  patientReference?: string;
  strength?: string | null;
};
type AppointmentOption = { id: string; dateTime: Date | string; patientId: string };

type PrescriptionSeed = {
  id: string;
  patientId: string;
  appointmentId?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  items: {
    medicineId: string;
    dosage: string;
    duration?: string | null;
    instructions?: string | null;
    quantity?: number | null;
  }[];
};

type Line = {
  key: string;
  medicineId: string;
  dosage: string;
  duration: string;
  instructions: string;
  quantity: string;
};

function newLine(): Line {
  return {
    key: Math.random().toString(36).slice(2),
    medicineId: "",
    dosage: "",
    duration: "",
    instructions: "",
    quantity: "",
  };
}

function linesFromPrescription(prescription?: PrescriptionSeed | null): Line[] {
  if (!prescription?.items?.length) return [newLine()];
  return prescription.items.map((item) => ({
    key: Math.random().toString(36).slice(2),
    medicineId: item.medicineId,
    dosage: item.dosage,
    duration: item.duration ?? "",
    instructions: item.instructions ?? "",
    quantity: item.quantity != null ? String(item.quantity) : "",
  }));
}

export function PrescriptionForm({
  prescription,
  patients,
  medicines,
  appointments,
  embedded,
  onSuccess,
  onCancel,
}: {
  prescription?: PrescriptionSeed | null;
  patients: Option[];
  medicines: Option[];
  appointments: AppointmentOption[];
} & FormShellProps) {
  const router = useRouter();
  const isEdit = Boolean(prescription?.id);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState(prescription?.patientId ?? "");
  const [appointmentId, setAppointmentId] = useState(prescription?.appointmentId ?? "");
  const [diagnosis, setDiagnosis] = useState(prescription?.diagnosis ?? "");
  const [notes, setNotes] = useState(prescription?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => linesFromPrescription(prescription));

  const filteredAppointments = useMemo(
    () => appointments.filter((a) => !patientId || a.patientId === patientId),
    [appointments, patientId]
  );

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
      diagnosis,
      notes,
      items: lines.map((line) => ({
        medicineId: line.medicineId,
        dosage: line.dosage,
        duration: line.duration,
        instructions: line.instructions,
        quantity: line.quantity ? Number(line.quantity) : undefined,
      })),
    };

    const res = await fetch(
      isEdit ? `/api/admin/prescriptions/${prescription!.id}` : "/api/admin/prescriptions",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save prescription");
      return;
    }
    const data = await res.json();
    toast.success(isEdit ? "Prescription updated" : "Prescription created");
    if (onSuccess) onSuccess();
    router.push(`/admin/prescriptions/${data.id}/print`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={formShellClassName(embedded, embedded ? undefined : "max-w-3xl")}>
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
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Input id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Medicines</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((l) => [...l, newLine()])}>
            <Plus className="size-4" />
            Add line
          </Button>
        </div>
        {lines.map((line, index) => (
          <div key={line.key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <AppSelect
                value={line.medicineId}
                onValueChange={(v) =>
                  setLines((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, medicineId: v } : r))
                  )
                }
                placeholder="Medicine"
                options={medicines.map((m) => ({
                  value: m.id,
                  label: m.strength ? `${m.name} ${m.strength}` : m.name,
                }))}
              />
            </div>
            <Input
              placeholder="Dosage"
              required
              value={line.dosage}
              onChange={(e) =>
                setLines((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, dosage: e.target.value } : r))
                )
              }
            />
            <Input
              placeholder="Duration"
              value={line.duration}
              onChange={(e) =>
                setLines((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, duration: e.target.value } : r))
                )
              }
            />
            <Input
              placeholder="Qty"
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) =>
                setLines((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r))
                )
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder="Instructions"
                value={line.instructions}
                onChange={(e) =>
                  setLines((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, instructions: e.target.value } : r))
                  )
                }
              />
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={2}
          className="min-h-0 resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !patientId}>
          {saving ? "Saving…" : isEdit ? "Update & print" : "Create & print"}
        </Button>
      </div>
    </form>
  );
}
