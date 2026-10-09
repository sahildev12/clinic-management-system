"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homeBookingServices } from "@/config/marketing";
import {
  combineDateAndSlot,
  getPublicBookingMaxDate,
  isClinicClosedDay,
  toLocalDateKey,
} from "@/lib/booking-slots";

const benefits = [
  "Comfort-first dental visits",
  "Clear treatment plans before you start",
  "Digital records and printable prescriptions",
  "Reminders for cleanings and follow-ups",
];

type SlotRow = {
  value: string;
  label12: string;
  available: boolean;
};

type Props = {
  clinicName: string;
};

export function SitePersonalCare({ clinicName }: Props) {
  const [saving, setSaving] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>(homeBookingServices[0]!.value);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const maxDate = useMemo(() => getPublicBookingMaxDate(), []);
  const dateKey = date ? toLocalDateKey(date) : null;

  useEffect(() => {
    if (!dateKey) {
      setSlots([]);
      setSlotsError(null);
      setTime("");
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);

    fetch(`/api/public/appointment-slots?date=${encodeURIComponent(dateKey)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load slots");
        return data as { closed?: boolean; slots?: SlotRow[] };
      })
      .then((data) => {
        if (cancelled) return;
        if (data.closed) {
          setSlots([]);
          setTime("");
          setSlotsError("Clinic is closed on this day.");
          return;
        }
        const nextSlots = data.slots ?? [];
        setSlots(nextSlots);
        const firstOpen = nextSlots.find((slot) => slot.available)?.value ?? "";
        setTime((current) =>
          nextSlots.some((slot) => slot.value === current && slot.available) ? current : firstOpen
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSlots([]);
        setTime("");
        setSlotsError(err instanceof Error ? err.message : "Could not load slots");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const availableOptions = slots
    .filter((slot) => slot.available)
    .map((slot) => ({ value: slot.value, label: slot.label12 }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date) {
      toast.error("Please pick a preferred date");
      return;
    }
    if (!time) {
      toast.error("Please choose an available time");
      return;
    }

    const preferred = combineDateAndSlot(date, time);
    if (preferred.getTime() < Date.now()) {
      toast.error("Please choose a future date and time");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        dateTime: preferred.toISOString(),
        notes: `Preferred treatment: ${service}`,
        paymentPreference: "COUNTER",
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not book appointment");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setBookingReference(
      typeof data.bookingReference === "string" ? data.bookingReference : "Pending"
    );
    setName("");
    setPhone("");
    setDate(undefined);
    setTime("");
    setSlots([]);
    toast.success("Appointment requested — we will confirm soon");
  }

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-[0.95fr_0.9fr_1.05fr]">
        <div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
            Care that feels personal
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            At {clinicName}, every visit starts with listening — then a clear plan for your smile,
            comfort, and long-term dental health.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-[var(--brand-charcoal)]">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-teal)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-[#eef2f6] shadow-[0_16px_40px_rgba(27,58,107,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=900&q=80"
            alt="Dentist ready for consultation"
            className="aspect-[4/5] w-full object-cover"
          />
        </div>

        <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_16px_50px_rgba(27,58,107,0.1)] md:p-6">
          <h3 className="text-xl font-extrabold text-[var(--brand-charcoal)]">Book an appointment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us when you&apos;d like to visit and we&apos;ll confirm from the clinic desk.
          </p>

          {bookingReference ? (
            <div className="mt-6 rounded-2xl bg-[var(--brand-cream)] px-4 py-6 text-center">
              <p className="text-sm font-semibold text-[var(--brand-charcoal)]">Request received</p>
              <p className="mt-2 font-mono text-lg font-bold tracking-wide text-[var(--brand-navy)]">
                {bookingReference}
              </p>
              <Button
                type="button"
                className="mt-4 rounded-full"
                onClick={() => setBookingReference(null)}
              >
                Book another
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="home-name">Your name</Label>
                <Input
                  id="home-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="home-phone">Phone number</Label>
                <Input
                  id="home-phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile number"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Select treatment</Label>
                <AppSelect
                  value={service}
                  onValueChange={setService}
                  options={homeBookingServices.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="home-date">Preferred date</Label>
                  <DatePickerField
                    id="home-date"
                    value={date}
                    onChange={(next) => {
                      setDate(next);
                      setTime("");
                    }}
                    placeholder="Select date"
                    disablePast
                    maxDate={maxDate}
                    isDateDisabled={isClinicClosedDay}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred time</Label>
                  <AppSelect
                    value={time}
                    onValueChange={setTime}
                    placeholder={
                      !date
                        ? "Pick a date first"
                        : slotsLoading
                          ? "Loading slots…"
                          : availableOptions.length === 0
                            ? "No open slots"
                            : "Select time"
                    }
                    disabled={!date || slotsLoading || availableOptions.length === 0}
                    options={availableOptions}
                  />
                </div>
              </div>
              {slotsError ? <p className="text-xs text-destructive">{slotsError}</p> : null}
              <Button
                type="submit"
                disabled={saving || !date || !time || slotsLoading}
                className="mt-2 h-11 w-full rounded-full bg-[var(--brand-teal)] text-base font-bold text-white hover:bg-[var(--brand-teal-dark)]"
              >
                {saving ? "Submitting…" : "Book Appointment"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
