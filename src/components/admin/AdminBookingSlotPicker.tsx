"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { DatePickerField } from "@/components/ui/date-picker-field";
import { Label } from "@/components/ui/label";
import {
  BOOKING_SLOT_MINUTES,
  combineDateAndSlot,
  formatLunchBreakLabel,
  isClinicClosedDay,
  toLocalDateKey,
} from "@/lib/booking-slots";
import { isProviderWorkDay } from "@/lib/provider-schedule";
import { cn } from "@/lib/utils";

type SlotRow = {
  value: string;
  label12: string;
  label24: string;
  available: boolean;
};

type Props = {
  selectedDate?: Date;
  selectedSlot?: string;
  onDateChange: (date: Date | undefined) => void;
  onSlotChange: (slot: string | undefined) => void;
  /** Keep this slot selectable even if booked (e.g. editing this appointment). */
  keepSlot?: string;
  providerId?: string;
};

export function AdminBookingSlotPicker({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  keepSlot,
  providerId,
}: Props) {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lunchLabel, setLunchLabel] = useState("1:00 PM – 2:00 PM");
  const [slotMinutes, setSlotMinutes] = useState(BOOKING_SLOT_MINUTES);
  const [workDays, setWorkDays] = useState<number[] | null>(null);

  const dateKey = selectedDate ? toLocalDateKey(selectedDate) : null;

  useEffect(() => {
    if (!dateKey || !selectedDate) {
      setSlots([]);
      setClosed(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ date: dateKey });
    if (providerId?.trim()) params.set("providerId", providerId.trim());

    fetch(`/api/admin/appointment-slots?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load slots");
        return data as {
          closed?: boolean;
          slots?: SlotRow[];
          lunchStartHour?: number;
          lunchEndHour?: number;
          slotMinutes?: number;
          workDays?: number[];
        };
      })
      .then((data) => {
        if (cancelled) return;
        setClosed(Boolean(data.closed));
        setSlots(data.slots ?? []);
        if (typeof data.slotMinutes === "number") setSlotMinutes(data.slotMinutes);
        if (Array.isArray(data.workDays)) setWorkDays(data.workDays);
        if (data.lunchStartHour != null && data.lunchEndHour != null) {
          setLunchLabel(formatLunchBreakLabel(data.lunchStartHour, data.lunchEndHour));
        }
        if (
          selectedSlot &&
          !(data.slots ?? []).some((slot) => slot.value === selectedSlot && slot.available)
        ) {
          onSlotChange(undefined);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSlots([]);
        setError(err instanceof Error ? err.message : "Could not load slots");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, providerId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedSummary =
    selectedDate && selectedSlot
      ? (() => {
          const start = combineDateAndSlot(selectedDate, selectedSlot);
          const end = new Date(start.getTime() + slotMinutes * 60_000);
          return `${format(start, "h:mmaaa")} – ${format(end, "h:mmaaa")}, ${format(
            selectedDate,
            "MMM d, yyyy"
          )}`;
        })()
      : null;

  function isDateDisabled(date: Date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    if (day < today) return true;
    if (workDays?.length) return !isProviderWorkDay(day, workDays);
    return isClinicClosedDay(day);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Visit date</Label>
        <DatePickerField
          value={selectedDate}
          onChange={(date) => {
            onDateChange(date);
            onSlotChange(undefined);
          }}
          placeholder="Select date"
          isDateDisabled={isDateDisabled}
        />
        <p className="text-[11px] text-muted-foreground">
          {workDays?.length
            ? "Uses this doctor's working days"
            : "Sundays closed"}{" "}
          · Lunch {lunchLabel} · {slotMinutes} min slots
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label>Time slot</Label>
          {selectedSummary ? (
            <span className="text-[11px] font-medium text-[var(--brand-navy)]">{selectedSummary}</span>
          ) : null}
        </div>

        {!selectedDate ? (
          <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-6 text-center text-sm text-muted-foreground">
            Choose a date to see open slots.
          </p>
        ) : loading ? (
          <p className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-6 text-center text-sm text-muted-foreground">
            Loading slots…
          </p>
        ) : error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-6 text-center text-sm text-red-600">
            {error}
          </p>
        ) : closed ? (
          <p className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-6 text-center text-sm text-muted-foreground">
            {providerId ? "Doctor is not available on this day." : "Clinic is closed on this day."}
          </p>
        ) : (() => {
          const availableSlots = slots.filter(
            (slot) => slot.available || (keepSlot != null && slot.value === keepSlot)
          );
          if (availableSlots.length === 0) {
            return (
              <p className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-6 text-center text-sm text-muted-foreground">
                No open slots left for this day. Try another date.
              </p>
            );
          }
          return (
            <ul className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {availableSlots.map((slot) => {
                const selected = selectedSlot === slot.value;
                return (
                  <li key={slot.value}>
                    <button
                      type="button"
                      onClick={() => onSlotChange(slot.value)}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                        !selected &&
                          "border-[#e3e3e3] bg-white text-[#1a1a1a] hover:border-[var(--brand-sky)] hover:bg-[#f0f7fc]",
                        selected &&
                          "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white"
                      )}
                    >
                      {slot.label12}
                    </button>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </div>
    </div>
  );
}
