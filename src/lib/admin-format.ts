export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Matches admin table style: 19 Jul 2026, 10:00 AM */
export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\bam\b/i, "AM")
    .replace(/\bpm\b/i, "PM");
}

export function formatTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\bam\b/i, "AM")
    .replace(/\bpm\b/i, "PM");
}

export function formatDate(value: Date | string) {
  const date =
    typeof value === "string" ? (parseFinanceDateKey(value) ?? new Date(value)) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function parsePageParams(input: {
  page?: string;
  pageSize?: string;
}) {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const pageSizeRaw = Number(input.pageSize ?? 10) || 10;
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function bookedByLabel(source: string) {
  if (source === "WEBSITE") return "Website";
  if (source === "WALK_IN") return "Front desk";
  return "Clinic Admin";
}

export function appointmentSourceLabel(source: string) {
  if (source === "WALK_IN") return "Walk-in";
  if (source === "WEBSITE") return "Website";
  if (source === "ADMIN") return "Admin";
  return source;
}

export function paymentPreferenceLabel(value?: string | null) {
  if (value === "ONLINE") return "Pay online";
  if (value === "COUNTER") return "Pay at counter";
  return "—";
}

export function paymentMethodLabel(value?: string | null) {
  if (value === "CASH") return "Cash";
  if (value === "ONLINE") return "Online";
  // Legacy values from older records (migrated to ONLINE in DB)
  if (value === "UPI" || value === "OTHER") return "Online";
  return value ?? "—";
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  SALARIES: "Salaries",
  SUPPLIES: "Supplies",
  EQUIPMENT: "Equipment",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export function expenseCategoryLabel(value?: string | null) {
  if (!value) return "—";
  return EXPENSE_CATEGORY_LABELS[value] ?? value;
}

export const EXPENSE_CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export type FinanceDateRange = {
  from: string;
  to: string;
  start: Date;
  end: Date;
};

export function parseFinanceDateKey(key?: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((key ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Parses `YYYY-MM-DD` range params; defaults both ends to today when omitted. */
export function resolveFinanceDateRange(from?: string | null, to?: string | null): FinanceDateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const fromKey = from?.trim() || todayKey;
  const toKey = to?.trim() || fromKey;
  const parsedFrom = parseFinanceDateKey(fromKey) ?? today;
  const parsedTo = parseFinanceDateKey(toKey) ?? parsedFrom;

  const start = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
  const end = parsedFrom <= parsedTo ? parsedTo : parsedFrom;

  const normalizedFrom = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const normalizedTo = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

  const startOfRange = new Date(start);
  startOfRange.setHours(0, 0, 0, 0);
  const endOfRange = new Date(end);
  endOfRange.setHours(23, 59, 59, 999);

  return {
    from: normalizedFrom,
    to: normalizedTo,
    start: startOfRange,
    end: endOfRange,
  };
}

export function formatFinanceRangeLabel(from?: string | null, to?: string | null) {
  const range = resolveFinanceDateRange(from, to);
  const fromDate = parseFinanceDateKey(range.from);
  const toDate = parseFinanceDateKey(range.to);
  if (!fromDate || !toDate) return "—";
  if (range.from === range.to) return formatDate(fromDate);
  return `${formatDate(fromDate)} – ${formatDate(toDate)}`;
}
