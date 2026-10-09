"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { toast } from "sonner";

import { AppointmentDetailDialog } from "@/components/admin/appointments/AppointmentDetailDialog";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  type AppointmentRow,
  AppointmentListView,
} from "@/components/admin/appointments/AppointmentListView";
import { Calendar } from "@/components/ui/calendar";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  appointmentGridStyle,
  buildTimeSlots,
  CALENDAR_END_HOUR,
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_START_HOUR,
  formatCalendarRangeLabel,
  getCurrentTimeLineOffset,
  getRangeForView,
  isToday,
  monthCalendarDays,
  parseDateKey,
  shiftCalendarAnchor,
  statusStyle,
  toDateKey,
  weekDayColumns,
  type CalendarView,
} from "@/lib/appointment-calendar";
import { formatTime } from "@/lib/admin-format";
import { DOCTOR_CATEGORY_OPTIONS } from "@/lib/doctor-categories";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

type ProviderOption = {
  id: string;
  name: string;
  category?: string | null;
  avatarUrl?: string | null;
  providerType?: string | null;
};

type PatientOption = { id: string; name: string; phone: string; patientReference?: string };

type ViewerRole = {
  role: string;
  providerId?: string | null;
  providerType?: string | null;
  isDoctor: boolean;
  isAdmin: boolean;
};

type Props = {
  appointments: AppointmentRow[];
  patients: PatientOption[];
  providers: ProviderOption[];
  total: number;
  page: number;
  pageSize: number;
  viewerRole: ViewerRole;
  filters: {
    status: string;
    source: string;
    q: string;
    providerId: string;
    category: string;
    view: string;
    anchor: string;
  };
};

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "WALK_IN", label: "Walk-in" },
];

function buildQuery(
  base: URLSearchParams,
  updates: Record<string, string | undefined>
) {
  const next = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (!value) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

export function AppointmentCalendarWorkspace({
  appointments: initialAppointments,
  patients,
  providers,
  total,
  page,
  pageSize,
  viewerRole,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (filters.view || "week") as CalendarView;
  const anchor = parseDateKey(filters.anchor);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [detail, setDetail] = useState<AppointmentRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isOwnSchedule = viewerRole.isDoctor && Boolean(viewerRole.providerId);
  const showProviderName = !isOwnSchedule;

  const scopedAppointments = useMemo(() => {
    if (!isOwnSchedule || !viewerRole.providerId) return appointments;
    return appointments.filter((appt) => appt.providerId === viewerRole.providerId);
  }, [appointments, isOwnSchedule, viewerRole.providerId]);

  const visibleDoctors = useMemo(() => {
    let docs = providers.filter((p) => p.providerType === "DOCTOR" || !p.providerType);
    if (filters.providerId) {
      docs = docs.filter((p) => p.id === filters.providerId);
    } else if (filters.category) {
      docs = docs.filter((p) => p.category === filters.category);
    }
    if (viewerRole.isDoctor && viewerRole.providerId) {
      docs = docs.filter((p) => p.id === viewerRole.providerId);
    }
    return docs;
  }, [providers, filters.providerId, filters.category, viewerRole]);

  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const gridHeight = timeSlots.length * CALENDAR_SLOT_HEIGHT_PX;

  const appointmentDays = useMemo(() => {
    const days = new Set<string>();
    for (const appt of scopedAppointments) {
      days.add(toDateKey(new Date(appt.dateTime)));
    }
    return days;
  }, [scopedAppointments]);

  const anchorDayAppointments = useMemo(() => {
    return scopedAppointments
      .filter((appt) => isSameDay(new Date(appt.dateTime), anchor))
      .sort(
        (a, b) =>
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
  }, [scopedAppointments, anchor]);

  const nowLineTop = useMemo(() => {
    if (view !== "day" && view !== "week") return null;
    return getCurrentTimeLineOffset(now);
  }, [view, now]);

  const anchorKey = filters.anchor;

  const loadCalendarAppointments = useCallback(async () => {
    if (view === "list") return;

    const range = getRangeForView(view, parseDateKey(anchorKey));
    const params = new URLSearchParams();
    params.set("calendar", "1");
    params.set("dateFrom", toDateKey(range.from));
    params.set("dateTo", toDateKey(range.to));
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.q) params.set("q", filters.q);
    if (filters.providerId) params.set("providerId", filters.providerId);
    if (filters.category) params.set("category", filters.category);

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error ?? "Could not load appointments");
      setAppointments(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load appointments");
    } finally {
      setLoading(false);
    }
  }, [
    view,
    anchorKey,
    filters.status,
    filters.source,
    filters.q,
    filters.providerId,
    filters.category,
  ]);

  useEffect(() => {
    if (view === "list") {
      setAppointments(initialAppointments);
    }
  }, [view, initialAppointments]);

  useEffect(() => {
    if (view === "list") return;
    void loadCalendarAppointments();
  }, [
    view,
    anchorKey,
    filters.status,
    filters.source,
    filters.q,
    filters.providerId,
    filters.category,
    loadCalendarAppointments,
  ]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    router.replace(`/admin/appointments?${buildQuery(searchParams, { new: undefined }).toString()}`, {
      scroll: false,
    });
  }, [searchParams, router]);

  function navigate(updates: Record<string, string | undefined>) {
    const query = buildQuery(searchParams, updates);
    router.push(`/admin/appointments?${query.toString()}`);
  }

  function handleViewChange(nextView: CalendarView) {
    navigate({ view: nextView, page: undefined });
  }

  function handleShift(direction: -1 | 0 | 1) {
    const next = shiftCalendarAnchor(view === "list" ? "week" : view, anchor, direction);
    navigate({ anchor: toDateKey(next), view });
  }

  function handleSuccess() {
    setFormOpen(false);
    setEditing(null);
    if (view === "list") {
      router.refresh();
    } else {
      void loadCalendarAppointments();
    }
  }

  function renderNowLine(show = false) {
    if (nowLineTop == null) return null;
    if (!show && !isToday(anchor)) return null;
    return (
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
        style={{ top: nowLineTop }}
      >
        <span className="absolute -left-1 size-2 rounded-full bg-[#ef4444] shadow-sm" />
        <span className="h-px flex-1 bg-[#ef4444]" />
      </div>
    );
  }

  function renderAppointmentCard(
    appt: AppointmentRow,
    compact = false,
    weekColumn = false
  ) {
    const style = statusStyle(appt.status);
    const end = new Date(
      new Date(appt.dateTime).getTime() + (appt.durationMinutes ?? 30) * 60_000
    );
    return (
      <button
        key={appt.id}
        type="button"
        onClick={() => {
          setDetail(appt);
          setDetailOpen(true);
        }}
        className={cn(
          "group relative flex h-full w-full overflow-hidden rounded-md border text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md",
          style.card,
          weekColumn ? "text-[10px]" : compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1", style.accent)} aria-hidden />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center",
            weekColumn ? "gap-0 py-1 pl-2 pr-1" : "gap-0.5 py-1.5 pl-2.5 pr-2"
          )}
        >
          <p className="truncate font-semibold leading-tight">{appt.patient.name}</p>
          {!weekColumn ? (
            <>
              <p className="truncate opacity-80">
                {formatTime(appt.dateTime)} – {formatTime(end)}
              </p>
              {showProviderName && !compact && appt.provider?.name ? (
                <p className="truncate opacity-70">Dr. {appt.provider.name}</p>
              ) : null}
              {!compact ? (
                <span
                  className={cn(
                    "mt-0.5 inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                    style.pill
                  )}
                >
                  {style.label}
                </span>
              ) : null}
            </>
          ) : (
            <p className="truncate text-[9px] opacity-75">{formatTime(appt.dateTime)}</p>
          )}
        </div>
      </button>
    );
  }

  function renderSidebarAgenda() {
    const heading = isToday(anchor) ? "Today" : format(anchor, "EEEE");

    return (
      <div className="overflow-hidden rounded-xl bg-[var(--brand-navy)] text-white shadow-sm">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            {heading}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{format(anchor, "d MMMM yyyy")}</p>
          <p className="mt-1 text-[11px] text-white/60">
            {anchorDayAppointments.length === 0
              ? "No appointments scheduled"
              : `${anchorDayAppointments.length} appointment${anchorDayAppointments.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="max-h-[300px] space-y-0.5 overflow-y-auto p-2">
          {anchorDayAppointments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <CalendarDays className="size-8 text-white/30" />
              <p className="text-xs text-white/50">Your schedule is clear for this day.</p>
            </div>
          ) : (
            anchorDayAppointments.map((appt) => {
              const style = statusStyle(appt.status);
              const end = new Date(
                new Date(appt.dateTime).getTime() + (appt.durationMinutes ?? 30) * 60_000
              );
              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => {
                    setDetail(appt);
                    setDetailOpen(true);
                  }}
                  className="flex w-full gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10"
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", style.accent)} />
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/55">
                      {formatTime(appt.dateTime)} – {formatTime(end)}
                    </p>
                    <p className="truncate text-sm font-medium">{appt.patient.name}</p>
                    <p className="truncate text-[11px] text-white/45">
                      {showProviderName && appt.provider?.name
                        ? `Dr. ${appt.provider.name}`
                        : style.label}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderDayDoctorGrid(day: Date) {
    const dayAppointments = scopedAppointments.filter((appt) =>
      isSameDay(new Date(appt.dateTime), day)
    );
    const singleColumnSchedule = isOwnSchedule && visibleDoctors.length === 1;

    return (
      <div className="min-w-0 flex-1 overflow-auto max-h-[calc(100vh-280px)]">
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: singleColumnSchedule
              ? "52px minmax(0, 1fr)"
              : `52px repeat(${Math.max(visibleDoctors.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-30 border-r border-[#e5e7eb] bg-[#f8f9fb]">
            <div className="sticky top-0 z-40 h-14 border-b border-[#e5e7eb] bg-[#f8f9fb]" />
            <div className="relative" style={{ height: gridHeight }}>
              {timeSlots.map((slot) =>
                slot.minute === 0 ? (
                  <div
                    key={`${slot.hour}-${slot.minute}`}
                    className="absolute right-2 text-[10px] font-medium tabular-nums text-[#9ca3af]"
                    style={{ top: slot.top + 12 }}
                  >
                    {slot.label}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {visibleDoctors.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No doctors match the current filters.
            </div>
          ) : (
            visibleDoctors.map((doctor) => {
              const columnAppointments = dayAppointments.filter(
                (appt) => appt.providerId === doctor.id
              );
              return (
                <div key={doctor.id} className="min-w-0 border-r border-[#e5e7eb] bg-white last:border-r-0">
                  <div className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-[#e5e7eb] bg-gradient-to-b from-[#fafbfc] to-white px-3">
                    {singleColumnSchedule ? (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">My schedule</p>
                        <p className="truncate text-[11px] capitalize text-[#9ca3af]">
                          {doctor.category?.replace(/_/g, " ").toLowerCase() ?? "Appointments"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2f7] text-[10px] font-bold text-[var(--brand-navy)] ring-2 ring-white shadow-sm">
                          {doctor.avatarUrl?.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={doctor.avatarUrl} alt="" className="size-full object-cover" />
                          ) : (
                            doctor.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#111827]">
                            Dr. {doctor.name}
                          </p>
                          <p className="truncate text-[11px] capitalize text-[#9ca3af]">
                            {doctor.category?.replace(/_/g, " ").toLowerCase() ?? "Doctor"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative bg-[linear-gradient(to_bottom,#fafbfc_0%,#ffffff_48px)]" style={{ height: gridHeight }}>
                    {timeSlots.map((slot) => (
                      <div
                        key={`line-${doctor.id}-${slot.hour}-${slot.minute}`}
                        className={cn(
                          "absolute inset-x-0 border-t",
                          slot.minute === 0 ? "border-[#e5e7eb]" : "border-[#f3f4f6]"
                        )}
                        style={{ top: slot.top }}
                      />
                    ))}
                    {renderNowLine()}
                    {columnAppointments.map((appt) => {
                      const pos = appointmentGridStyle(appt.dateTime, appt.durationMinutes ?? 30);
                      return (
                        <div
                          key={appt.id}
                          className="absolute inset-x-1 z-10"
                          style={{ top: pos.top, height: pos.height }}
                        >
                          {renderAppointmentCard(appt, pos.height < 64)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderWeekGrid() {
    const days = weekDayColumns(anchor);
    return (
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
        >
          <div className="sticky left-0 z-30 border-r border-[#e5e7eb] bg-[#f8f9fb]">
            <div className="sticky top-0 z-40 h-12 border-b border-[#e5e7eb] bg-[#f8f9fb]" />
            <div className="relative" style={{ height: gridHeight }}>
              {timeSlots.map((slot) =>
                slot.minute === 0 ? (
                  <div
                    key={`week-${slot.hour}-${slot.minute}`}
                    className="absolute right-1.5 text-[9px] font-medium tabular-nums leading-none text-[#9ca3af]"
                    style={{ top: slot.top + 12 }}
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
                ) : null
              )}
            </div>
          </div>
          {days.map((day) => {
            const dayAppts = scopedAppointments.filter((appt) =>
              isSameDay(new Date(appt.dateTime), day)
            );
            const today = isToday(day);
            return (
              <div
                key={toDateKey(day)}
                className={cn(
                  "min-w-0 border-r border-[#e5e7eb] bg-white last:border-r-0",
                  today && "bg-[#f7fcfb]"
                )}
              >
                <button
                  type="button"
                  onClick={() => navigate({ view: "day", anchor: toDateKey(day) })}
                  className={cn(
                    "sticky top-0 z-20 flex h-12 w-full flex-col items-center justify-center border-b border-[#e5e7eb] px-0.5 transition hover:bg-[#f5f7fb]",
                    today && "bg-[#eefaf8]"
                  )}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      today
                        ? "bg-[var(--brand-teal)] text-white"
                        : "text-[#111827]"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </button>
                <div className="relative" style={{ height: gridHeight }}>
                  {timeSlots.map((slot) => (
                    <div
                      key={`weekline-${toDateKey(day)}-${slot.hour}-${slot.minute}`}
                      className={cn(
                        "absolute inset-x-0 border-t",
                        slot.minute === 0 ? "border-[#e5e7eb]" : "border-[#f3f4f6]"
                      )}
                      style={{ top: slot.top }}
                    />
                  ))}
                  {today ? renderNowLine(true) : null}
                  {dayAppts.map((appt) => {
                    const pos = appointmentGridStyle(appt.dateTime, appt.durationMinutes ?? 30);
                    return (
                      <div
                        key={appt.id}
                        className="absolute inset-x-0.5 z-10"
                        style={{ top: pos.top, height: pos.height }}
                      >
                        {renderAppointmentCard(appt, true, true)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMonthGrid() {
    const days = monthCalendarDays(anchor);
    return (
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#e5e7eb]">
        <div className="grid grid-cols-7 gap-px">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div
              key={label}
              className="bg-[#f8f9fb] px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[#6b7177]"
            >
              {label}
            </div>
          ))}
          {days.map((day) => {
            const dayAppts = scopedAppointments.filter((appt) =>
              isSameDay(new Date(appt.dateTime), day)
            );
            const inMonth = isSameMonth(day, anchor);
            const today = isToday(day);
            return (
              <button
                key={toDateKey(day)}
                type="button"
                onClick={() => navigate({ view: "day", anchor: toDateKey(day) })}
                className={cn(
                  "min-h-[120px] bg-white p-2 text-left align-top transition hover:bg-[#fafbfc]",
                  !inMonth && "bg-[#fafafa]/90 text-[#9ca3af]",
                  today && "ring-2 ring-inset ring-[var(--brand-teal)]/40"
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      today
                        ? "bg-[var(--brand-teal)] text-white"
                        : inMonth
                          ? "text-[#111827]"
                          : "text-[#9ca3af]"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayAppts.length > 0 ? (
                    <span className="rounded-full bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b7177]">
                      {dayAppts.length}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map((appt) => {
                    const style = statusStyle(appt.status);
                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                          style.card
                        )}
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", style.accent)} />
                        <span className="truncate">
                          {formatTime(appt.dateTime)} {appt.patient.name}
                        </span>
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 ? (
                    <p className="pl-1 text-[10px] font-medium text-[#6b7177]">
                      + {dayAppts.length - 3} more
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <AdminPageHeader
        title="Appointments"
        description="Manage and schedule clinic appointments."
        action={
          <button type="button" className={adminPrimaryButtonClassName()} onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}>
            <Plus className="mr-1.5 size-4" />
            New Appointment
          </button>
        }
      />

      <div className="flex flex-col gap-5 xl:flex-row">
        <aside
          className={cn(
            "w-full shrink-0 space-y-4",
            view === "week" ? "xl:w-[240px]" : "xl:w-[280px]"
          )}
        >
          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <Calendar
              mode="single"
              selected={anchor}
              onSelect={(date) => date && navigate({ anchor: toDateKey(date), view })}
              modifiers={{ hasAppointment: (date) => appointmentDays.has(toDateKey(date)) }}
              modifiersClassNames={{
                hasAppointment:
                  "after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[var(--brand-teal)]",
              }}
              className="mx-auto [--cell-size:2.25rem] p-3"
              classNames={{
                today: "rounded-full bg-[#eefaf8] text-[var(--brand-teal-dark)] font-semibold",
                selected:
                  "rounded-full bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal)] hover:text-white",
              }}
            />
            <div className="border-t border-[#f0f0f0] px-3 pb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-[#e5e7eb] text-xs font-semibold"
                onClick={() => handleShift(0)}
              >
                Jump to today
              </Button>
            </div>
          </div>

          {view !== "list" && view !== "week" ? renderSidebarAgenda() : null}

          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827]">Filters</p>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--brand-teal)] hover:underline"
                onClick={() =>
                  navigate({
                    status: undefined,
                    source: undefined,
                    providerId: undefined,
                    category: undefined,
                    q: undefined,
                  })
                }
              >
                Reset
              </button>
            </div>
            <div className="space-y-3">
              {!viewerRole.isDoctor ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Doctor</Label>
                  <AppSelect
                    value={filters.providerId}
                    onValueChange={(value) => navigate({ providerId: value || undefined })}
                    allowEmpty
                    emptyLabel="All doctors"
                    options={providers.map((p) => ({
                      value: p.id,
                      label: `Dr. ${p.name}`,
                    }))}
                  />
                </div>
              ) : null}
              {!viewerRole.isDoctor ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Specialization</Label>
                  <AppSelect
                    value={filters.category}
                    onValueChange={(value) => navigate({ category: value || undefined })}
                    allowEmpty
                    emptyLabel="All specializations"
                    options={DOCTOR_CATEGORY_OPTIONS}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <AppSelect
                  value={filters.status}
                  onValueChange={(value) => navigate({ status: value || undefined })}
                  allowEmpty
                  emptyLabel="All statuses"
                  options={STATUS_OPTIONS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <AppSelect
                  value={filters.source}
                  onValueChange={(value) => navigate({ source: value || undefined })}
                  allowEmpty
                  emptyLabel="All sources"
                  options={SOURCE_OPTIONS}
                />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-md hover:bg-white"
                    onClick={() => handleShift(-1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-md px-3 text-xs font-semibold hover:bg-white"
                    onClick={() => handleShift(0)}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-md hover:bg-white"
                    onClick={() => handleShift(1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div>
                  <p className="text-base font-bold tracking-tight text-[#111827]">
                    {formatCalendarRangeLabel(view === "list" ? "week" : view, anchor)}
                  </p>
                  {view !== "list" && anchorDayAppointments.length > 0 ? (
                    <p className="text-[11px] text-[#6b7177]">
                      {anchorDayAppointments.length} on this day
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <div className="flex items-center gap-0.5 rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] p-1">
                  {VIEW_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleViewChange(option.value)}
                      className={cn(
                        "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold leading-none transition",
                        view === option.value
                          ? "bg-[var(--brand-teal)] text-white"
                          : "text-[#6b7177] hover:bg-white hover:text-[#111827]"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <form
                  className="relative w-full sm:w-52"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate({ q: searchInput.trim() || undefined });
                  }}
                >
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9ca3af]" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search patient…"
                    className="h-9 border-[#e5e7eb] bg-[#f8f9fb] pl-8 text-xs focus-visible:bg-white"
                  />
                </form>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            {loading ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3">
                <div className="size-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[var(--brand-teal)]" />
                <p className="text-sm text-[#6b7177]">Loading schedule…</p>
              </div>
            ) : view === "list" ? (
              <AppointmentListView
                appointments={scopedAppointments}
                total={total}
                page={page}
                pageSize={pageSize}
                hideDoctorColumn={isOwnSchedule}
                onEdit={(appt) => {
                  setEditing(appt);
                  setFormOpen(true);
                }}
                onRefresh={() => router.refresh()}
              />
            ) : view === "day" ? (
              renderDayDoctorGrid(anchor)
            ) : view === "week" ? (
              renderWeekGrid()
            ) : (
              <div className="p-4">{renderMonthGrid()}</div>
            )}
          </div>
        </section>
      </div>

      <AdminFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit appointment" : "New appointment"}
        className="sm:max-w-lg"
      >
        <AppointmentForm
          key={editing?.id ?? "new"}
          appointment={editing}
          patients={patients}
          providers={providers}
          defaultProviderId={viewerRole.isDoctor ? viewerRole.providerId ?? "" : undefined}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setFormOpen(false)}
        />
      </AdminFormDialog>

      <AppointmentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        appointment={detail}
        viewerRole={viewerRole}
        onEdit={(appt) => {
          setEditing(appt);
          setFormOpen(true);
        }}
        onUpdated={() => void loadCalendarAppointments()}
      />
    </div>
  );
}
