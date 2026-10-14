"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Clock3 } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  combineDateAndSlot,
  getPublicBookingMaxDate,
  isClinicClosedDay,
  isOutsidePublicBookingWindow,
  startOfLocalDay,
  toLocalDateKey,
} from "@/lib/booking-slots";
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
  durationMinutes?: number;
  clinicSlug?: string;
  /** When set, slots and working days come from this doctor's own schedule. */
  providerId?: string;
  /** Weekdays (0=Sun … 6=Sat) the chosen doctor works. Falls back to Mon–Sat. */
  workDays?: number[];
  /** When set, the picker is locked and shows this message (e.g. "Select a doctor first"). */
  blockedMessage?: string;
};

export function BookingSlotPicker({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  durationMinutes = 30,
  clinicSlug,
  providerId,
  workDays,
  blockedMessage,
}: Props) {
  const [hour12, setHour12] = useState(true);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotListRef = useRef<HTMLUListElement>(null);

  const dateKey = selectedDate ? toLocalDateKey(selectedDate) : null;

  useEffect(() => {
    if (!dateKey || !selectedDate || blockedMessage) {
      setSlots([]);
      setClosed(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `/api/public/appointment-slots?date=${encodeURIComponent(dateKey)}${
        clinicSlug ? `&clinicSlug=${encodeURIComponent(clinicSlug)}` : ""
      }${providerId ? `&providerId=${encodeURIComponent(providerId)}` : ""}`
    )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load slots");
        return data as {
          closed?: boolean;
          slots?: SlotRow[];
        };
      })
      .then((data) => {
        if (cancelled) return;
        setClosed(Boolean(data.closed));
        setSlots(data.slots ?? []);
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
    // intentionally omit selectedSlot/onSlotChange to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, clinicSlug, providerId, blockedMessage]);

  useEffect(() => {
    if (loading || !slotListRef.current || slots.length === 0) return;

    const list = slotListRef.current;
    const targetValue =
      selectedSlot && slots.some((slot) => slot.value === selectedSlot && slot.available)
        ? selectedSlot
        : slots.find((slot) => slot.available)?.value;

    if (!targetValue) return;

    const target = list.querySelector<HTMLElement>(`[data-slot-value="${targetValue}"]`);
    if (!target) return;

    // Align the first available (or selected) slot near the top so following
    // available slots stay in view without scrolling the page itself.
    const nextFrame = requestAnimationFrame(() => {
      list.scrollTo({
        top: Math.max(0, target.offsetTop - 4),
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(nextFrame);
  }, [slots, loading, dateKey, selectedSlot]);

  const selectedSummary = useMemo(() => {
    if (!selectedDate || !selectedSlot) return null;
    const start = combineDateAndSlot(selectedDate, selectedSlot);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return `${format(start, hour12 ? "h:mmaaa" : "HH:mm")} – ${format(
      end,
      hour12 ? "h:mmaaa" : "HH:mm"
    )}, ${format(selectedDate, "MMMM d, yyyy")}`;
  }, [selectedDate, selectedSlot, durationMinutes, hour12]);

  const today = startOfLocalDay();
  const maxDate = getPublicBookingMaxDate();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--brand-navy)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Clock3 className="size-4 text-[var(--brand-teal)]" aria-hidden />
            Select date &amp; time
          </p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
            {durationMinutes} min
          </span>
          {selectedSummary ? (
            <span className="rounded-full bg-[color-mix(in_oklab,var(--brand-teal)_28%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-white">
              {selectedSummary}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="shrink-0 border-b border-white/10 p-3 md:w-[260px] md:border-r md:border-b-0 lg:w-[280px] lg:p-4">
          <p className="mb-2 text-sm font-semibold text-white/80">Select a date</p>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              // Always keep one date selected — ignore toggle-off clicks.
              if (!date) return;
              onDateChange(date);
              onSlotChange(undefined);
            }}
            startMonth={today}
            endMonth={maxDate}
            disabled={(date) => {
              if (blockedMessage || isOutsidePublicBookingWindow(date)) return true;
              return workDays ? !workDays.includes(date.getDay()) : isClinicClosedDay(date);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-1.5 text-white [--cell-radius:0.65rem] [--cell-size:2rem]"
            classNames={{
              root: "w-full",
              months: "relative w-full",
              month: "w-full gap-2",
              nav: "absolute inset-x-0 top-0 z-10 flex w-full items-center justify-between px-0.5",
              month_caption: "relative flex h-8 w-full items-center justify-center",
              weekdays: "gap-0",
              weekday: "text-white/45 text-[0.7rem] flex-1",
              week: "gap-0 mt-0.5",
              today:
                "[&_button]:rounded-lg [&_button]:border [&_button]:border-dashed [&_button]:border-[var(--brand-teal)] [&_button]:bg-transparent [&_button]:text-white",
              selected:
                "[&_button]:rounded-lg [&_button]:border-transparent [&_button]:bg-[var(--brand-teal)] [&_button]:text-white [&_button]:hover:bg-[var(--brand-teal)] [&_button]:hover:text-white",
              day: "text-white/85 hover:bg-transparent rounded-lg flex-1 p-0",
              day_button:
                "size-8 text-white hover:bg-white/10 data-[selected-single=true]:bg-[var(--brand-teal)] data-[selected-single=true]:text-white data-[selected-single=true]:hover:bg-[var(--brand-teal)] data-[selected-single=true]:hover:text-white",
              caption_label: "text-white text-sm font-semibold",
              button_previous:
                "inline-flex size-8 items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30",
              button_next:
                "inline-flex size-8 items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30",
              outside: "text-white/25",
              disabled: "text-white/20 opacity-40",
            }}
          />
        </div>

        <div className="flex min-h-[18rem] min-w-0 flex-1 flex-col p-3 lg:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white/80">
              {selectedDate ? format(selectedDate, "EEE dd") : "Time slots"}
            </p>
            <div className="inline-flex rounded-full bg-white/10 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setHour12(true)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  hour12 ? "bg-white text-[var(--brand-navy)]" : "text-white/70 hover:text-white"
                )}
              >
                12h
              </button>
              <button
                type="button"
                onClick={() => setHour12(false)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  !hour12 ? "bg-white text-[var(--brand-navy)]" : "text-white/70 hover:text-white"
                )}
              >
                24h
              </button>
            </div>
          </div>

          {blockedMessage ? (
            <p className="py-10 text-center text-sm text-white/60">{blockedMessage}</p>
          ) : !selectedDate ? (
            <p className="py-10 text-center text-sm text-white/50">Choose a date to see open slots.</p>
          ) : loading ? (
            <p className="py-10 text-center text-sm text-white/50">Loading slots…</p>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-200">{error}</p>
          ) : closed ? (
            <p className="py-10 text-center text-sm text-white/50">
              {providerId ? "This doctor is not available on this day." : "Clinic is closed on this day."}
            </p>
          ) : slots.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/50">No slots available.</p>
          ) : slots.every((slot) => !slot.available) ? (
            <p className="py-10 text-center text-sm text-white/50">
              No open slots left for this day. Try another date.
            </p>
          ) : (
            <ul
              ref={slotListRef}
              className="booking-slot-scroll max-h-[calc(6*2.5rem+5*0.5rem)] space-y-2 overflow-y-auto pr-1"
            >
              {slots.map((slot) => {
                const selected = selectedSlot === slot.value;
                return (
                  <li key={slot.value} data-slot-value={slot.value}>
                    <button
                      type="button"
                      disabled={!slot.available}
                      onClick={() => onSlotChange(slot.value)}
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold transition-colors",
                        !slot.available &&
                          "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
                        slot.available &&
                          !selected &&
                          "border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10",
                        selected && "border-white bg-white text-[var(--brand-navy)]"
                      )}
                    >
                      <span>{hour12 ? slot.label12 : slot.label24}</span>
                      {selected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-teal)] px-2.5 py-1 text-xs font-bold text-white">
                          <span
                            aria-hidden
                            className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                          />
                          Selected
                        </span>
                      ) : slot.available ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200/90">
                          Available
                          <span
                            aria-hidden
                            className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]"
                          />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-200/70">
                          Unavailable
                          <span
                            aria-hidden
                            className="size-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                          />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}