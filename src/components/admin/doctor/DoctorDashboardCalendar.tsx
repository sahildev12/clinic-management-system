"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  appointmentGridStyle,
  buildTimeSlots,
  CALENDAR_SLOT_HEIGHT_PX,
  statusStyle,
  toDateKey,
} from "@/lib/appointment-calendar";
import { formatTime } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

export type DashboardCalendarAppointment = {
  id: string;
  dateTime: string;
  durationMinutes: number;
  status: string;
  source: string;
  notes: string | null;
  patient: { name: string };
};

type Props = {
  initialDate: string;
  initialAppointments: DashboardCalendarAppointment[];
};

const GRID_START = 8;
const GRID_END = 17;

export function DoctorDashboardCalendar({ initialDate, initialAppointments }: Props) {
  const [anchor, setAnchor] = useState(() => new Date(initialDate));
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);

  const timeSlots = useMemo(
    () => buildTimeSlots(GRID_START, GRID_END, 60),
    []
  );
  const gridHeight = timeSlots.length * CALENDAR_SLOT_HEIGHT_PX;

  const loadDay = useCallback(async (day: Date) => {
    const key = toDateKey(day);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        calendar: "1",
        dateFrom: key,
        dateTo: key,
      });
      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      const data = (await res.json()) as DashboardCalendarAppointment[];
      if (res.ok) {
        setAppointments(
          data.map((row) => ({
            ...row,
            dateTime:
              typeof row.dateTime === "string"
                ? row.dateTime
                : new Date(row.dateTime).toISOString(),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSameDay(anchor, new Date(initialDate))) {
      setAppointments(initialAppointments);
      return;
    }
    void loadDay(anchor);
  }, [anchor, initialDate, initialAppointments, loadDay]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appt) => isSameDay(new Date(appt.dateTime), anchor))
        .sort(
          (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        ),
    [appointments, anchor]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setAnchor((day) => subDays(day, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setAnchor(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setAnchor((day) => addDays(day, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-sm font-semibold text-[#111827]">{format(anchor, "d MMMM yyyy")}</p>
        <div className="flex gap-1 rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] p-1">
          {(["day", "week", "month"] as const).map((view) => (
            <Link
              key={view}
              href={`/admin/appointments?view=${view}&anchor=${toDateKey(anchor)}`}
              className={cn(
                "inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-semibold capitalize leading-none transition",
                view === "day"
                  ? "bg-[var(--brand-teal)] text-white"
                  : "text-[#6b7177] hover:bg-white"
              )}
            >
              {view}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative min-h-[360px] flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="size-7 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[var(--brand-teal)]" />
          </div>
        ) : null}
        <div className="grid" style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}>
          <div className="relative border-r border-[#e5e7eb] pr-2" style={{ height: gridHeight }}>
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="absolute right-0 text-[10px] font-medium tabular-nums text-[#9ca3af]"
                style={{ top: slot.top + 10 }}
              >
                {format(
                  (() => {
                    const d = new Date();
                    d.setHours(slot.hour, 0, 0, 0);
                    return d;
                  })(),
                  "ha"
                ).toLowerCase()}
              </div>
            ))}
          </div>
          <div className="relative" style={{ height: gridHeight }}>
            {timeSlots.map((slot) => (
              <div
                key={`line-${slot.hour}`}
                className="absolute inset-x-0 border-t border-[#eef0f2]"
                style={{ top: slot.top }}
              />
            ))}
            {dayAppointments.map((appt) => {
              const pos = appointmentGridStyle(
                appt.dateTime,
                appt.durationMinutes ?? 30,
                GRID_START,
                60,
                CALENDAR_SLOT_HEIGHT_PX
              );
              const style = statusStyle(appt.status);
              const end = new Date(
                new Date(appt.dateTime).getTime() + (appt.durationMinutes ?? 30) * 60_000
              );
              return (
                <Link
                  key={appt.id}
                  href={`/admin/appointments/${appt.id}`}
                  className={cn(
                    "absolute inset-x-1 z-10 overflow-hidden rounded-md border px-2 py-1 text-left shadow-sm transition hover:shadow-md",
                    style.card
                  )}
                  style={{ top: pos.top, height: pos.height }}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1", style.accent)} />
                  <p className="truncate pl-1.5 text-[10px] font-semibold leading-tight">
                    {formatTime(appt.dateTime)} – {formatTime(end)}
                  </p>
                  <p className="truncate pl-1.5 text-[11px] font-semibold">{appt.patient.name}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
