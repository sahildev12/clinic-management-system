import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type DoctorStatsPeriod = "today" | "week" | "month";

export type DoctorPeriodStats = {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  upcoming: number;
};

export function timeGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatDoctorDisplayDate(now = new Date()) {
  return format(now, "EEEE, d MMMM yyyy");
}

export function getStatsPeriodRange(period: DoctorStatsPeriod, now = new Date()) {
  if (period === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (period === "month") {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  return {
    from: startOfWeek(now, { weekStartsOn: 1 }),
    to: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function categorizeAppointmentForStats(
  status: string,
  dateTime: Date,
  now: Date
): keyof Omit<DoctorPeriodStats, "total"> {
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  if (
    dateTime.getTime() >= now.getTime() &&
    (status === "PENDING" || status === "CONFIRMED")
  ) {
    return "upcoming";
  }
  if (status === "PENDING") return "pending";
  return "pending";
}

export function buildPeriodStats(
  rows: { status: string; dateTime: Date }[],
  now: Date
): DoctorPeriodStats {
  const stats: DoctorPeriodStats = {
    total: rows.length,
    completed: 0,
    pending: 0,
    cancelled: 0,
    upcoming: 0,
  };
  for (const row of rows) {
    const bucket = categorizeAppointmentForStats(row.status, row.dateTime, now);
    stats[bucket] += 1;
  }
  return stats;
}

export function appointmentVisitLabel(notes?: string | null) {
  const trimmed = notes?.trim();
  if (trimmed && trimmed.length <= 48) return trimmed;
  return "Consultation";
}

export const DOCTOR_STATS_PERIOD_OPTIONS: { value: DoctorStatsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export const DOCTOR_DONUT_COLORS = {
  completed: "#22c55e",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  upcoming: "#8b5cf6",
} as const;
