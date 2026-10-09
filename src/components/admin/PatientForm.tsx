"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AdminBookingSlotPicker } from "@/components/admin/AdminBookingSlotPicker";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toDatePayload, toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_SLOT_MINUTES,
  combineDateAndSlot,
} from "@/lib/booking-slots";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";
import {
  isValidIndiaMobile,
  sanitizeIndiaMobileDigits,
  toIndiaE164,
  toIndiaMobileLocalDigits,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

type Patient = {
  id?: string;
  patientReference?: string;
  name: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  address?: string | null;
  notes?: string | null;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  slot?: string;
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

function isValidOptionalEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Chrome ignores autocomplete=off; unlock on focus instead. */
function unlockAutofillGuard(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.removeAttribute("readOnly");
}

export function PatientForm({
  patient,
  embedded,
  onSuccess,
  onCancel,
  onCreated,
  hideBookAppointment = false,
}: {
  patient?: Patient | null;
  /** Called after a new patient is created (before navigation / onSuccess). */
  onCreated?: (patient: {
    id: string;
    name: string;
    phone: string;
    patientReference?: string;
  }) => void;
  /** Hide “Book appointment now” (e.g. when creating from New appointment). */
  hideBookAppointment?: boolean;
} & FormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(patient?.id);
  const [name, setName] = useState(patient?.name ?? "");
  const [phone, setPhone] = useState(() =>
    patient?.phone ? toIndiaMobileLocalDigits(patient.phone) : ""
  );
  const [email, setEmail] = useState(patient?.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(parseDate(patient?.dateOfBirth));
  const [gender, setGender] = useState(patient?.gender ?? "");
  const [address, setAddress] = useState(patient?.address ?? "");
  const [notes, setNotes] = useState(patient?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const [bookAppointment, setBookAppointment] = useState(!isEdit && !hideBookAppointment);
  const [visitDate, setVisitDate] = useState<Date | undefined>(() =>
    isEdit ? undefined : defaultVisitDate()
  );
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();

  function finish(redirectTo?: string) {
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/patients");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!phone.trim()) next.phone = "Phone is required";
    else if (!isValidIndiaMobile(phone)) next.phone = "Enter a valid 10-digit mobile number";
    if (!isValidOptionalEmail(email)) next.email = "Enter a valid email address";
    if (dateOfBirth) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateOfBirth.getTime() > today.getTime()) {
        next.dateOfBirth = "Date of birth cannot be in the future";
      }
    }
    if (!isEdit && bookAppointment && (!visitDate || !selectedSlot)) {
      next.slot = "Pick a visit date and time slot";
    }
    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(
        nextErrors.name ??
          nextErrors.phone ??
          nextErrors.email ??
          nextErrors.dateOfBirth ??
          nextErrors.slot ??
          "Please fix the form errors"
      );
      return;
    }

    if (!isEdit && bookAppointment && visitDate && selectedSlot) {
      const preferred = combineDateAndSlot(visitDate, selectedSlot);
      if (preferred.getTime() < Date.now()) {
        toast.error("Please choose a future time slot");
        return;
      }
    }

    setSaving(true);
    setErrors({});
    const payload = {
      name: name.trim(),
      phone: toIndiaE164(phone),
      email: email.trim(),
      dateOfBirth: dateOfBirth ? toDatePayload(dateOfBirth) : "",
      gender,
      address: address.trim(),
      notes: isEdit ? notes : "",
    };

    const res = await fetch(isEdit ? `/api/admin/patients/${patient!.id}` : "/api/admin/patients", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save patient");
      return;
    }

    const savedPatient = (await res.json()) as {
      id: string;
      name: string;
      phone: string;
      patientReference?: string;
    };

    if (!isEdit && bookAppointment && visitDate && selectedSlot) {
      const appointmentDateTime = combineDateAndSlot(visitDate, selectedSlot);
      const apptRes = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: savedPatient.id,
          dateTime: toDateTimePayload(appointmentDateTime),
          durationMinutes: BOOKING_SLOT_MINUTES,
          status: "CONFIRMED",
          source: "WALK_IN",
          notes: "",
        }),
      });

      setSaving(false);

      if (!apptRes.ok) {
        const data = await apptRes.json().catch(() => ({}));
        toast.error(
          data.error ?? "Patient saved, but appointment could not be created. Book it from Appointments."
        );
        onCreated?.(savedPatient);
        finish();
        return;
      }

      const appointment = (await apptRes.json()) as { id: string };
      toast.success("Patient and appointment created");
      onCreated?.(savedPatient);
      onSuccess?.();
      finish(`/admin/appointments/${appointment.id}/print`);
      return;
    }

    setSaving(false);
    toast.success(isEdit ? "Patient updated" : "Patient created");
    if (!isEdit) onCreated?.(savedPatient);
    if (onSuccess) {
      onSuccess();
      return;
    }
    finish();
  }

  return (
    <form
      onSubmit={onSubmit}
      className={formShellClassName(embedded)}
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      data-bwignore="true"
      data-form-type="other"
    >
      {/* Soak browser autofill into hidden decoys so real fields stay empty. */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
        <input type="text" name="name" autoComplete="name" tabIndex={-1} defaultValue="" />
        <input type="email" name="email" autoComplete="email" tabIndex={-1} defaultValue="" />
        <input type="tel" name="phone" autoComplete="tel" tabIndex={-1} defaultValue="" />
        <input type="text" name="address" autoComplete="street-address" tabIndex={-1} defaultValue="" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {patient?.patientReference ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="patientReference">Reference</Label>
            <Input
              id="patientReference"
              value={patient.patientReference}
              readOnly
              disabled
              autoComplete="off"
              className="font-medium tabular-nums"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="cms-patient-name">Name</Label>
          <Input
            id="cms-patient-name"
            name="cms-patient-name"
            required
            readOnly
            onFocus={unlockAutofillGuard}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-invalid={Boolean(errors.name)}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cms-patient-phone">Phone</Label>
          <div
            className={cn(
              "flex h-8 overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-3",
              errors.phone
                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                : "border-input focus-within:border-ring focus-within:ring-ring/50"
            )}
          >
            <span className="inline-flex shrink-0 items-center border-r border-input bg-[#f8fafc] px-2.5 text-sm font-semibold text-[var(--brand-navy)]">
              +91
            </span>
            <input
              id="cms-patient-phone"
              name="cms-patient-phone"
              type="text"
              inputMode="numeric"
              maxLength={10}
              readOnly
              onFocus={unlockAutofillGuard}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              aria-invalid={Boolean(errors.phone)}
              value={phone}
              onChange={(e) => {
                setPhone(sanitizeIndiaMobileDigits(e.target.value));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none"
            />
          </div>
          {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cms-patient-email">Email (optional)</Label>
          <Input
            id="cms-patient-email"
            name="cms-patient-email"
            type="text"
            inputMode="email"
            readOnly
            onFocus={unlockAutofillGuard}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-invalid={Boolean(errors.email)}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label>Date of birth</Label>
          <DatePickerField
            value={dateOfBirth}
            onChange={(date) => {
              setDateOfBirth(date);
              if (errors.dateOfBirth) setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
            }}
            placeholder="Select date"
            disableFuture
          />
          {errors.dateOfBirth ? (
            <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <AppSelect
            value={gender}
            onValueChange={setGender}
            placeholder="Select gender"
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cms-patient-address">Address (optional)</Label>
          <Textarea
            id="cms-patient-address"
            name="cms-patient-address"
            rows={2}
            readOnly
            onFocus={unlockAutofillGuard}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            className="min-h-0 resize-y"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {isEdit ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              className="min-h-0 resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        ) : null}

        {!isEdit && !hideBookAppointment ? (
          <div className="space-y-3 sm:col-span-2 rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bookAppointment"
                checked={bookAppointment}
                onCheckedChange={(value) => setBookAppointment(Boolean(value))}
              />
              <Label htmlFor="bookAppointment">Book appointment now</Label>
            </div>
            {bookAppointment ? (
              <div className="space-y-3">
                <AdminBookingSlotPicker
                  selectedDate={visitDate}
                  selectedSlot={selectedSlot}
                  onDateChange={(date) => {
                    setVisitDate(date);
                    if (errors.slot) setErrors((prev) => ({ ...prev, slot: undefined }));
                  }}
                  onSlotChange={(slot) => {
                    setSelectedSlot(slot);
                    if (errors.slot) setErrors((prev) => ({ ...prev, slot: undefined }));
                  }}
                />
                {errors.slot ? <p className="text-xs text-destructive">{errors.slot}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? "Saving…"
            : isEdit
              ? "Update patient"
              : bookAppointment
                ? "Create & print appointment"
                : "Create patient"}
        </Button>
      </div>
    </form>
  );
}
