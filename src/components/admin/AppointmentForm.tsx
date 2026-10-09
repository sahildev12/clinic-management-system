"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminBookingSlotPicker } from "@/components/admin/AdminBookingSlotPicker";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { PatientForm } from "@/components/admin/PatientForm";
import {
  PatientSearchSelect,
  type PatientSearchOption,
} from "@/components/admin/PatientSearchSelect";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_SLOT_MINUTES,
  combineDateAndSlot,
} from "@/lib/booking-slots";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import { paymentPreferenceLabel } from "@/lib/admin-format";

type Appointment = {
  id?: string;
  patientId: string;
  providerId?: string | null;
  dateTime: Date | string;
  durationMinutes?: number;
  status: string;
  source: string;
  paymentPreference?: string | null;
  notes?: string | null;
};

function parseDate(value?: Date | string | null) {
  if (!value) return undefined;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function defaultVisitDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

function slotValueFromDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ProviderOption = {
  id: string;
  name: string;
  providerType?: string | null;
};

export function AppointmentForm({
  appointment,
  patients: initialPatients,
  providers = [],
  defaultProviderId,
  embedded,
  onSuccess,
  onCancel,
}: {
  appointment?: Appointment | null;
  patients: PatientSearchOption[];
  providers?: ProviderOption[];
  defaultProviderId?: string;
} & FormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(appointment?.id);
  const [patients, setPatients] = useState(initialPatients);
  const [patientId, setPatientId] = useState(appointment?.patientId ?? "");
  const [providerId, setProviderId] = useState(
    appointment?.providerId ?? defaultProviderId ?? ""
  );
  const [slotMinutes, setSlotMinutes] = useState(appointment?.durationMinutes ?? BOOKING_SLOT_MINUTES);

  const initialDateTime = parseDate(appointment?.dateTime);
  const [visitDate, setVisitDate] = useState<Date | undefined>(() =>
    initialDateTime
      ? (() => {
          const d = new Date(initialDateTime);
          d.setHours(0, 0, 0, 0);
          return d;
        })()
      : defaultVisitDate()
  );
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>(() =>
    initialDateTime ? slotValueFromDate(initialDateTime) : undefined
  );
  const keepSlot = isEdit && initialDateTime ? slotValueFromDate(initialDateTime) : undefined;

  const [status, setStatus] = useState(appointment?.status ?? "CONFIRMED");
  const [source, setSource] = useState(
    appointment?.source === "ADMIN" ? "WALK_IN" : (appointment?.source ?? "WALK_IN")
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setSlotMinutes(BOOKING_SLOT_MINUTES);
      return;
    }

    let cancelled = false;
    fetch(`/api/admin/providers/${providerId}/schedule`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return null;
        return data as { appointmentDurationMinutes?: number };
      })
      .then((data) => {
        if (cancelled || !data?.appointmentDurationMinutes) return;
        setSlotMinutes(data.appointmentDurationMinutes);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/appointments");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patientId) {
      toast.error("Select a patient");
      return;
    }
    if (!visitDate || !selectedSlot) {
      toast.error("Pick a visit date and time slot");
      return;
    }

    const dateTime = combineDateAndSlot(visitDate, selectedSlot);
    if (!isEdit && dateTime.getTime() < Date.now()) {
      toast.error("Please choose a future time slot");
      return;
    }

    setSaving(true);
    const payload = {
      patientId,
      providerId: providerId || "",
      dateTime: toDateTimePayload(dateTime),
      durationMinutes: slotMinutes,
      status,
      source,
      notes,
    };

    const res = await fetch(
      isEdit ? `/api/admin/appointments/${appointment!.id}` : "/api/admin/appointments",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save appointment");
      return;
    }
    toast.success(isEdit ? "Appointment updated" : "Appointment created");
    finish();
  }

  return (
    <>
      <form onSubmit={onSubmit} className={formShellClassName(embedded)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Patient</Label>
            <PatientSearchSelect
              patients={patients}
              value={patientId}
              onValueChange={setPatientId}
              onAddNewPatient={isEdit ? undefined : () => setNewPatientOpen(true)}
              placeholder="Search by name, phone, or reference"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Provider (optional)</Label>
            <AppSelect
              value={providerId}
              onValueChange={(value) => {
                setProviderId(value);
                setSelectedSlot(undefined);
              }}
              allowEmpty
              emptyLabel="Unassigned"
              placeholder="Select doctor or staff"
              options={providers.map((provider) => ({
                value: provider.id,
                label:
                  provider.providerType === "DOCTOR"
                    ? `Dr. ${provider.name}`
                    : provider.name,
              }))}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3">
            <AdminBookingSlotPicker
              selectedDate={visitDate}
              selectedSlot={selectedSlot}
              keepSlot={keepSlot}
              providerId={providerId || undefined}
              onDateChange={(date) => {
                setVisitDate(date);
                setSelectedSlot(undefined);
              }}
              onSlotChange={setSelectedSlot}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <AppSelect
              value={status}
              onValueChange={setStatus}
              options={[
                { value: "PENDING", label: "Pending" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <AppSelect
              value={source}
              onValueChange={setSource}
              options={[
                { value: "WEBSITE", label: "Website" },
                { value: "WALK_IN", label: "Walk-in" },
              ]}
            />
          </div>
          {appointment?.paymentPreference ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Payment preference</Label>
              <p className="flex h-8 items-center rounded-lg border border-input bg-[#f8fafc] px-2.5 text-sm text-[#374151]">
                {paymentPreferenceLabel(appointment.paymentPreference)}
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
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
          <Button type="submit" disabled={saving || !patientId || !selectedSlot}>
            {saving ? "Saving…" : isEdit ? "Update appointment" : "Create appointment"}
          </Button>
        </div>
      </form>

      <AdminFormDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        title="Add patient"
        description="Create the patient, then continue booking this appointment."
        className="sm:max-w-lg"
      >
        <PatientForm
          key="new-from-appointment"
          embedded
          hideBookAppointment
          onCancel={() => setNewPatientOpen(false)}
          onCreated={(created) => {
            setPatients((prev) =>
              prev.some((p) => p.id === created.id) ? prev : [created, ...prev]
            );
            setPatientId(created.id);
            setNewPatientOpen(false);
            router.refresh();
          }}
          onSuccess={() => setNewPatientOpen(false)}
        />
      </AdminFormDialog>
    </>
  );
}
