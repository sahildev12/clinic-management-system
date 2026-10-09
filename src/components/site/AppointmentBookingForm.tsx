"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Clock3,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { BookingSlotPicker } from "@/components/site/BookingSlotPicker";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { homeBookingServices } from "@/config/marketing";
import {
  BOOKING_SLOT_MINUTES,
  combineDateAndSlot,
  isClinicClosedDay,
} from "@/lib/booking-slots";
import { isValidIndiaMobile, sanitizeIndiaMobileDigits, toIndiaE164 } from "@/lib/phone";
import { toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { cn } from "@/lib/utils";

function defaultBookingDate(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  while (isClinicClosedDay(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

const highlights = [
  {
    icon: CalendarCheck,
    title: "Same-week openings",
    text: "Pick a live clinic slot — no phone tag for basic visits.",
  },
  {
    icon: Clock3,
    title: "30-minute visits",
    text: "Clear appointment length so you can plan your day.",
  },
  {
    icon: ShieldCheck,
    title: "Confirmed by staff",
    text: "We review every request and send a confirmation.",
  },
] as const;

const NOTES_MAX = 300;

/** Sticky site header offset so focused/invalid fields stay visible. */
const FIELD_SCROLL_MT = "scroll-mt-28";

type PaymentPreference = "ONLINE" | "COUNTER";

type FieldErrors = {
  name?: string;
  phone?: string;
  service?: string;
  slot?: string;
  paymentPreference?: string;
};

function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function paymentPreferenceLabel(value: PaymentPreference) {
  return value === "ONLINE" ? "Pay online" : "Pay at counter";
}

export function AppointmentBookingForm({
  lunchBreakLabel = "1:00 PM – 2:00 PM",
  clinicSlug,
  clinicName,
  doctors = [],
}: {
  lunchBreakLabel?: string;
  clinicSlug?: string;
  clinicName?: string;
  doctors?: { id: string; name: string; category?: string | null }[];
}) {
  const [saving, setSaving] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [confirmedPaymentPreference, setConfirmedPaymentPreference] =
    useState<PaymentPreference | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [service, setService] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(() => defaultBookingDate());
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference>("ONLINE");
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleDateChange(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(undefined);
    setErrors((prev) => ({ ...prev, slot: undefined }));
  }

  function validateFields(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Full name is required";
    if (!phone.trim()) next.phone = "Phone number is required";
    else if (!isValidIndiaMobile(phone)) next.phone = "Enter a valid 10-digit mobile number";
    if (!service.trim()) next.service = "Please select a treatment";
    if (!selectedSlot) next.slot = "Please pick a time slot";
    if (!paymentPreference) next.paymentPreference = "Please choose how you would like to pay";
    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validateFields();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstId = nextErrors.name
        ? "name"
        : nextErrors.phone
          ? "phone"
          : nextErrors.service
            ? "service"
            : nextErrors.slot
              ? "booking-slot-picker"
              : "payment-preference";
      requestAnimationFrame(() => focusField(firstId));
      if (nextErrors.slot && !nextErrors.name && !nextErrors.phone && !nextErrors.service) {
        toast.error(nextErrors.slot);
      }
      return;
    }

    const preferred = combineDateAndSlot(selectedDate, selectedSlot!);
    if (preferred.getTime() < Date.now()) {
      toast.error("Please choose a future date and time");
      return;
    }

    setSaving(true);
    setErrors({});
    const treatmentNote = `Preferred treatment: ${service}`;
    const payload = {
      name: name.trim(),
      phone: toIndiaE164(phone),
      email,
      dateTime: toDateTimePayload(preferred),
      notes: notes.trim() ? `${treatmentNote}\n${notes.trim()}` : treatmentNote,
      paymentPreference,
      ...(clinicSlug ? { clinicSlug } : {}),
    };

    const res = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not book appointment");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setConfirmedPaymentPreference(paymentPreference);
    setBookingReference(
      typeof data.bookingReference === "string" ? data.bookingReference : "Pending"
    );
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setService("");
    setSelectedDate(defaultBookingDate());
    setSelectedSlot(undefined);
    setPaymentPreference("ONLINE");
    setErrors({});
    toast.success("Appointment requested — we will confirm soon");
  }

  if (bookingReference) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm">
        <h2 className="font-heading text-xl font-extrabold text-[var(--brand-charcoal)]">
          Request received
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team will review your preferred time and confirm your visit. Keep this reference for
          follow-up:
        </p>
        <p className="mt-4 inline-flex rounded-lg bg-[#f5f5f5] px-4 py-2 font-mono text-lg font-semibold tracking-wide text-[#1a1a1a]">
          {bookingReference}
        </p>
        {confirmedPaymentPreference ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Payment preference:{" "}
            <span className="font-semibold text-[var(--brand-charcoal)]">
              {paymentPreferenceLabel(confirmedPaymentPreference)}
            </span>
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-6"
          onClick={() => {
            setBookingReference(null);
            setConfirmedPaymentPreference(null);
          }}
        >
          Book another
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10"
    >
      <aside className="max-w-md space-y-8 lg:sticky lg:top-24">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--brand-sky)]">
            <Sparkles className="size-4" aria-hidden />
            Online booking
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
            Book an appointment
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            One simple form — your details and a clinic slot in the same place.
          </p>
        </div>

        <ul className="space-y-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-sky)] shadow-sm ring-1 ring-black/5">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-[var(--brand-charcoal)]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="relative overflow-hidden rounded-2xl bg-[var(--brand-navy)] p-5 text-white shadow-[0_16px_40px_rgba(27,58,107,0.18)]">
          <div className="absolute -right-5 -top-5 size-24 rounded-full bg-[var(--brand-sky)]/35" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              Clinic hours
            </p>
            <p className="mt-1.5 font-heading text-xl font-extrabold">Mon–Sat · 9 AM – 6 PM</p>
            <p className="mt-1.5 text-sm text-white/70">
              Sundays closed · Lunch {lunchBreakLabel}
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_20px_50px_rgba(27,58,107,0.1)]">
        <div className="space-y-5 px-5 py-5 md:px-7 md:py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={cn("space-y-2", FIELD_SCROLL_MT)}>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Enter your full name"
                className={FIELD_SCROLL_MT}
              />
              {errors.name ? (
                <p id="name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              ) : null}
            </div>
            <div className={cn("space-y-2", FIELD_SCROLL_MT)}>
              <Label htmlFor="phone">Phone</Label>
              <div
                className={cn(
                  "flex h-8 overflow-hidden rounded-lg border bg-transparent transition-colors focus-within:ring-3",
                  errors.phone
                    ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                    : "border-input focus-within:border-ring focus-within:ring-ring/50"
                )}
              >
                <span className="inline-flex shrink-0 items-center border-r border-input bg-[#f8fafc] px-2.5 text-sm font-semibold text-[var(--brand-navy)]">
                  +91
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizeIndiaMobileDigits(e.target.value));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  className={cn(
                    "min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none",
                    FIELD_SCROLL_MT
                  )}
                />
              </div>
              {errors.phone ? (
                <p id="phone-error" className="text-xs text-destructive">
                  {errors.phone}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
              />
            </div>
            <div className={cn("space-y-2", FIELD_SCROLL_MT)}>
              <Label htmlFor="service">Treatment</Label>
              <AppSelect
                id="service"
                value={service}
                onValueChange={(value) => {
                  setService(value);
                  if (errors.service) setErrors((prev) => ({ ...prev, service: undefined }));
                }}
                placeholder="Select a treatment"
                aria-invalid={Boolean(errors.service)}
                aria-describedby={errors.service ? "service-error" : undefined}
                options={homeBookingServices.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
              {errors.service ? (
                <p id="service-error" className="text-xs text-destructive">
                  {errors.service}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {notes.length}/{NOTES_MAX}
              </span>
            </div>
            <Textarea
              id="notes"
              maxLength={NOTES_MAX}
              rows={1}
              placeholder="Symptoms, preferred dentist, or anything we should know…"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
              className="min-h-8 field-sizing-fixed resize-y py-1.5"
            />
          </div>
        </div>

        <div
          id="booking-slot-picker"
          className={cn(
            "border-t border-[#eef0f2] bg-[#f7fafc] px-4 py-4 md:px-5 md:py-5",
            FIELD_SCROLL_MT,
            errors.slot && "ring-2 ring-inset ring-destructive/40"
          )}
        >
          <BookingSlotPicker
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onDateChange={handleDateChange}
            onSlotChange={(slot) => {
              setSelectedSlot(slot);
              if (errors.slot) setErrors((prev) => ({ ...prev, slot: undefined }));
            }}
            durationMinutes={BOOKING_SLOT_MINUTES}
            clinicSlug={clinicSlug}
          />
          {errors.slot ? (
            <p className="mt-2 text-center text-xs text-destructive">{errors.slot}</p>
          ) : null}
        </div>

        <div className="border-t border-[#eef0f2] px-5 py-5 md:px-7">
          <div id="payment-preference" className={cn("space-y-3", FIELD_SCROLL_MT)} tabIndex={-1}>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-charcoal)]">
                How would you like to pay?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose a preference — staff will confirm your visit.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentPreference("ONLINE");
                  if (errors.paymentPreference) {
                    setErrors((prev) => ({ ...prev, paymentPreference: undefined }));
                  }
                }}
                aria-pressed={paymentPreference === "ONLINE"}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  paymentPreference === "ONLINE"
                    ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_10%,white)] ring-2 ring-[var(--brand-teal)]/25"
                    : "border-black/10 bg-white hover:border-black/20",
                  errors.paymentPreference && paymentPreference !== "ONLINE" && "border-destructive"
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-charcoal)]">
                  <CreditCard className="size-4 text-[var(--brand-teal)]" aria-hidden />
                  Pay online
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                  Preferred for holding your selected slot. Staff will share payment details when
                  confirming.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentPreference("COUNTER");
                  if (errors.paymentPreference) {
                    setErrors((prev) => ({ ...prev, paymentPreference: undefined }));
                  }
                }}
                aria-pressed={paymentPreference === "COUNTER"}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  paymentPreference === "COUNTER"
                    ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_10%,white)] ring-2 ring-[var(--brand-teal)]/25"
                    : "border-black/10 bg-white hover:border-black/20",
                  errors.paymentPreference && paymentPreference !== "COUNTER" && "border-destructive"
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-charcoal)]">
                  <Store className="size-4 text-[var(--brand-navy)]" aria-hidden />
                  Pay at counter
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                  Pay at the clinic when you visit.
                </span>
              </button>
            </div>
            {paymentPreference === "COUNTER" ? (
              <p
                role="note"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"
              >
                Counter payments may be confirmed later than online requests. Your preferred slot is
                a request only and <strong>may change</strong> if the clinic is busy.
              </p>
            ) : null}
            {errors.paymentPreference ? (
              <p className="text-xs text-destructive">{errors.paymentPreference}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="mt-5 h-12 w-full rounded-full bg-[var(--brand-teal)] text-base font-bold text-white hover:bg-[var(--brand-teal-dark)]"
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <CalendarCheck className="size-4" aria-hidden />
            )}
            {saving
              ? "Submitting…"
              : paymentPreference === "ONLINE"
                ? "Book appointment"
                : "Request appointment"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            We&apos;ll confirm your appointment shortly.
          </p>
        </div>
      </div>
    </form>
  );
}
