import {
  BOOKING_DAY_END_HOUR,
  BOOKING_DAY_START_HOUR,
  normalizeLunchHours,
  type LunchHours,
} from "@/lib/booking-slots";

export const PROVIDER_DURATION_MIN = 10;
export const PROVIDER_DURATION_MAX = 60;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const DEFAULT_PROVIDER_WORK_DAYS = [1, 2, 3, 4, 5, 6];

export type ProviderScheduleRecord = {
  appointmentDurationMinutes: number;
  workDays: number[];
  workStartHour: number;
  workEndHour: number;
  lunchStartHour: number;
  lunchEndHour: number;
  useClinicHours: boolean;
};

export type ResolvedProviderSchedule = ProviderScheduleRecord & {
  lunchStartHour: number;
  lunchEndHour: number;
};

export function normalizeWorkDays(days: number[] | undefined | null) {
  const unique = [...new Set((days ?? []).map((d) => Math.trunc(d)).filter((d) => d >= 0 && d <= 6))];
  unique.sort((a, b) => a - b);
  return unique.length ? unique : [...DEFAULT_PROVIDER_WORK_DAYS];
}

export function isProviderWorkDay(date: Date, workDays: number[]) {
  return workDays.includes(date.getDay());
}

export function formatWorkDaysLabel(workDays: number[]) {
  const labels = WEEKDAY_OPTIONS.filter((d) => workDays.includes(d.value)).map((d) => d.label);
  if (labels.length === 0) return "No days selected";
  if (labels.length === 7) return "Every day";
  return labels.map((l) => l.slice(0, 3)).join(", ");
}

export function defaultProviderScheduleFromClinic(clinicLunch?: Partial<LunchHours>): ProviderScheduleRecord {
  const lunch = normalizeLunchHours(clinicLunch?.lunchStartHour, clinicLunch?.lunchEndHour);
  return {
    appointmentDurationMinutes: 30,
    workDays: [...DEFAULT_PROVIDER_WORK_DAYS],
    workStartHour: BOOKING_DAY_START_HOUR,
    workEndHour: BOOKING_DAY_END_HOUR,
    lunchStartHour: lunch.lunchStartHour,
    lunchEndHour: lunch.lunchEndHour,
    useClinicHours: true,
  };
}

/** Applies clinic lunch defaults when the doctor still follows clinic hours. */
export function resolveProviderSchedule(
  schedule: ProviderScheduleRecord,
  clinicLunch?: Partial<LunchHours>
): ResolvedProviderSchedule {
  const lunch = schedule.useClinicHours
    ? normalizeLunchHours(clinicLunch?.lunchStartHour, clinicLunch?.lunchEndHour)
    : normalizeLunchHours(schedule.lunchStartHour, schedule.lunchEndHour);

  return {
    ...schedule,
    workStartHour: schedule.workStartHour,
    workEndHour: schedule.workEndHour,
    lunchStartHour: lunch.lunchStartHour,
    lunchEndHour: lunch.lunchEndHour,
  };
}

export const APPOINTMENT_DURATION_OPTIONS = [10, 15, 20, 30, 45, 60].map((value) => ({
  value: String(value),
  label: `${value} minutes`,
}));
