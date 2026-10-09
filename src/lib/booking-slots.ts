import { format } from "date-fns";

/** Default public booking window for the dental clinic. */
export const BOOKING_SLOT_MINUTES = 30;
export const BOOKING_DAY_START_HOUR = 9;
export const BOOKING_DAY_END_HOUR = 18;
/** Closed for lunch — no slots in this hour range [start, end). */
export const BOOKING_LUNCH_START_HOUR = 13;
export const BOOKING_LUNCH_END_HOUR = 14;
/** Public site: patients can only book this many calendar days ahead (inclusive of today). */
export const BOOKING_MAX_DAYS_AHEAD = 40;

export type BookingSlot = {
  /** "HH:mm" 24h local */
  value: string;
  label12: string;
  label24: string;
  hours: number;
  minutes: number;
};

export type LunchHours = {
  lunchStartHour: number;
  lunchEndHour: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function clampHour(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(23, Math.max(0, Math.trunc(value)));
}

export function normalizeLunchHours(
  lunchStartHour?: number | null,
  lunchEndHour?: number | null
): LunchHours {
  const start = clampHour(lunchStartHour ?? BOOKING_LUNCH_START_HOUR, BOOKING_LUNCH_START_HOUR);
  let end = clampHour(lunchEndHour ?? BOOKING_LUNCH_END_HOUR, BOOKING_LUNCH_END_HOUR);
  if (end <= start) {
    end = Math.min(23, start + 1);
  }
  return { lunchStartHour: start, lunchEndHour: end };
}

export function formatHourLabel(hour: number) {
  const date = new Date();
  date.setHours(clampHour(hour, 0), 0, 0, 0);
  return format(date, "h:mm a");
}

export function formatLunchBreakLabel(lunchStartHour: number, lunchEndHour: number) {
  const { lunchStartHour: start, lunchEndHour: end } = normalizeLunchHours(
    lunchStartHour,
    lunchEndHour
  );
  return `${formatHourLabel(start)} – ${formatHourLabel(end)}`;
}

export function formatSlotLabel(hours: number, minutes: number, hour12: boolean) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, hour12 ? "h:mm a" : "HH:mm");
}

export type GenerateDaySlotsOptions = Partial<LunchHours> & {
  dayStartHour?: number;
  dayEndHour?: number;
  slotMinutes?: number;
};

/** Generate clinic time slots for a day (not including availability). */
export function generateDaySlots(options?: GenerateDaySlotsOptions): BookingSlot[] {
  const dayStart = options?.dayStartHour ?? BOOKING_DAY_START_HOUR;
  const dayEnd = options?.dayEndHour ?? BOOKING_DAY_END_HOUR;
  const slotMinutes = options?.slotMinutes ?? BOOKING_SLOT_MINUTES;
  const { lunchStartHour, lunchEndHour } = normalizeLunchHours(
    options?.lunchStartHour,
    options?.lunchEndHour
  );
  const slots: BookingSlot[] = [];
  for (let hour = dayStart; hour < dayEnd; hour += 1) {
    if (hour >= lunchStartHour && hour < lunchEndHour) continue;
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      if (hour === dayEnd - 1 && minute + slotMinutes > 60) continue;
      const value = `${pad(hour)}:${pad(minute)}`;
      slots.push({
        value,
        label12: formatSlotLabel(hour, minute, true),
        label24: formatSlotLabel(hour, minute, false),
        hours: hour,
        minutes: minute,
      });
    }
  }
  return slots;
}

export function isClinicClosedDay(date: Date) {
  // Sunday closed
  return date.getDay() === 0;
}

/** Start of today in local time. */
export function startOfLocalDay(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Last calendar day patients may book on the public site (today + BOOKING_MAX_DAYS_AHEAD). */
export function getPublicBookingMaxDate(from = new Date()) {
  const max = startOfLocalDay(from);
  max.setDate(max.getDate() + BOOKING_MAX_DAYS_AHEAD);
  return max;
}

/** True when `date` is before today or more than BOOKING_MAX_DAYS_AHEAD days out. */
export function isOutsidePublicBookingWindow(date: Date, from = new Date()) {
  const day = startOfLocalDay(date);
  const today = startOfLocalDay(from);
  const max = getPublicBookingMaxDate(from);
  return day < today || day > max;
}

export function combineDateAndSlot(date: Date, slotValue: string): Date {
  const [hours, minutes] = slotValue.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return next;
}

export function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
