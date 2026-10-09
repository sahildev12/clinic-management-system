import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type CalendarView = "day" | "week" | "month" | "list";

export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 19;
export const CALENDAR_SLOT_MINUTES = 30;
export const CALENDAR_SLOT_HEIGHT_PX = 48;

export function parseDateKey(key?: string | null) {
  if (!key?.trim()) return startOfDay(new Date());
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return startOfDay(new Date());
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return startOfDay(new Date());
  return startOfDay(date);
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getRangeForView(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "month") {
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }
  if (view === "week" || view === "list") {
    const from = startOfWeek(anchor, { weekStartsOn: 1 });
    const to = endOfWeek(anchor, { weekStartsOn: 1 });
    return { from: startOfDay(from), to: endOfDay(to) };
  }
  const from = startOfWeek(anchor, { weekStartsOn: 1 });
  const to = endOfWeek(anchor, { weekStartsOn: 1 });
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function formatCalendarRangeLabel(view: CalendarView, anchor: Date) {
  if (view === "day") return format(anchor, "d MMMM yyyy");
  if (view === "month") return format(anchor, "MMMM yyyy");
  const { from, to } = getRangeForView("week", anchor);
  if (isSameMonth(from, to)) {
    return `${format(from, "d")} – ${format(to, "d MMMM yyyy")}`;
  }
  return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
}

export function shiftCalendarAnchor(view: CalendarView, anchor: Date, direction: -1 | 0 | 1) {
  if (direction === 0) return startOfDay(new Date());
  if (view === "day") return direction === 1 ? addDays(anchor, 1) : subDays(anchor, 1);
  if (view === "month") return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  return direction === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
}

export function buildTimeSlots(
  startHour = CALENDAR_START_HOUR,
  endHour = CALENDAR_END_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES
) {
  const slots: { label: string; hour: number; minute: number; top: number }[] = [];
  let index = 0;
  for (let hour = startHour; hour < endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      slots.push({
        label: format(date, "h:mm a"),
        hour,
        minute,
        top: index * CALENDAR_SLOT_HEIGHT_PX,
      });
      index += 1;
    }
  }
  return slots;
}

export function appointmentGridStyle(
  dateTime: Date | string,
  durationMinutes: number,
  dayStartHour = CALENDAR_START_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES,
  slotHeight = CALENDAR_SLOT_HEIGHT_PX
) {
  const start = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const gridStartMinutes = dayStartHour * 60;
  const offsetSlots = (startMinutes - gridStartMinutes) / slotMinutes;
  const heightSlots = Math.max(durationMinutes / slotMinutes, 1);
  return {
    top: offsetSlots * slotHeight,
    height: heightSlots * slotHeight - 4,
  };
}

export function weekDayColumns(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthCalendarDays(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export { isSameDay, isSameMonth, isToday, startOfDay };

export const APPOINTMENT_STATUS_STYLES: Record<
  string,
  { card: string; accent: string; pill: string; label: string }
> = {
  CONFIRMED: {
    card: "border-[#c8ebe4] bg-[#f4fbf9] text-[#0f4c45]",
    accent: "bg-[var(--brand-teal)]",
    pill: "bg-[#dff5f0] text-[#0f4c45]",
    label: "Confirmed",
  },
  PENDING: {
    card: "border-[#f0dfa8] bg-[#fffbf0] text-[#7a4b00]",
    accent: "bg-amber-400",
    pill: "bg-[#fff3d4] text-[#7a4b00]",
    label: "Pending",
  },
  COMPLETED: {
    card: "border-[#b8dfc4] bg-[#f2faf4] text-[#1f5a33]",
    accent: "bg-emerald-500",
    pill: "bg-[#e4f5ea] text-[#1f5a33]",
    label: "Completed",
  },
  CANCELLED: {
    card: "border-[#f0caca] bg-[#fef6f6] text-[#8b1c1c]",
    accent: "bg-red-400",
    pill: "bg-[#fde8e8] text-[#8b1c1c]",
    label: "Cancelled",
  },
};

export function statusStyle(status: string) {
  return APPOINTMENT_STATUS_STYLES[status] ?? APPOINTMENT_STATUS_STYLES.PENDING;
}

export function getCurrentTimeLineOffset(
  now = new Date(),
  dayStartHour = CALENDAR_START_HOUR,
  endHour = CALENDAR_END_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES,
  slotHeight = CALENDAR_SLOT_HEIGHT_PX
) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const gridStart = dayStartHour * 60;
  const gridEnd = endHour * 60;
  if (minutes < gridStart || minutes > gridEnd) return null;
  const offsetSlots = (minutes - gridStart) / slotMinutes;
  return offsetSlots * slotHeight;
}
