import { paymentMethodLabel } from "@/lib/admin-format";
import { adminStatusLabel } from "@/lib/admin-status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#fff4e5] text-[#c47a00]",
  CONFIRMED: "bg-[#e6fbf9] text-[var(--brand-teal-dark)]",
  COMPLETED: "bg-[#e7f8ef] text-[#15803d]",
  CANCELLED: "bg-[#fde8e8] text-[#dc2626]",
  DONE: "bg-[#e7f8ef] text-[#15803d]",
  ACTIVE: "bg-[#e7f8ef] text-[#15803d]",
  INACTIVE: "bg-[#f3f4f6] text-[#6b7280]",
  CASH: "bg-[#eef2ff] text-[#4338ca]",
  ONLINE: "bg-[#e0f2fe] text-[#0369a1]",
  UPI: "bg-[#e0f2fe] text-[#0369a1]",
  OTHER: "bg-[#e0f2fe] text-[#0369a1]",
  WEBSITE: "bg-[#f3f4f6] text-[#374151]",
  WALK_IN: "bg-[#f3f4f6] text-[#374151]",
  ADMIN: "bg-[#f3f4f6] text-[#374151]",
};

type Props = {
  status: string;
  className?: string;
  label?: string;
};

export function AdminStatusPill({ status, className, label }: Props) {
  const key = status.toUpperCase();
  const resolvedLabel =
    label ??
    (key === "CASH" || key === "ONLINE" || key === "UPI" || key === "OTHER"
      ? paymentMethodLabel(key)
      : adminStatusLabel(key));

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[key] ?? "bg-[#f3f4f6] text-[#4b5563]",
        className
      )}
    >
      {resolvedLabel}
    </span>
  );
}
