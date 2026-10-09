import { DOCTOR_DONUT_COLORS } from "@/lib/doctor-dashboard";
import type { DoctorPeriodStats } from "@/lib/doctor-dashboard";

type Slice = {
  key: keyof typeof DOCTOR_DONUT_COLORS;
  label: string;
  value: number;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

type Props = {
  stats: DoctorPeriodStats;
  size?: number;
};

export function DonutChart({ stats, size = 148 }: Props) {
  const slices: Slice[] = (
    [
      { key: "completed" as const, label: "Completed", value: stats.completed },
      { key: "pending" as const, label: "Pending", value: stats.pending },
      { key: "cancelled" as const, label: "Cancelled", value: stats.cancelled },
      { key: "upcoming" as const, label: "Upcoming", value: stats.upcoming },
    ] as Slice[]
  ).filter((slice) => slice.value > 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const stroke = size * 0.14;
  const total = stats.total;

  if (total === 0) {
    return (
      <div
        className="relative mx-auto flex items-center justify-center rounded-full bg-[#f3f4f6]"
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-[#9ca3af]">0</p>
          <p className="text-[11px] font-medium text-[#9ca3af]">Total</p>
        </div>
      </div>
    );
  }

  let cursor = 0;
  const segments = slices.map((slice) => {
    const angle = (slice.value / total) * 360;
    const start = cursor;
    const end = cursor + angle;
    cursor = end;
    return { ...slice, start, end: end - 0.4 };
  });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {segments.map((segment) => (
          <path
            key={segment.key}
            d={describeArc(cx, cy, radius, segment.start, segment.end)}
            fill="none"
            stroke={DOCTOR_DONUT_COLORS[segment.key]}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold tabular-nums text-[#111827]">{total}</p>
        <p className="text-[11px] font-medium text-[#6b7177]">Total</p>
      </div>
    </div>
  );
}

export function DonutLegend({ stats }: { stats: DoctorPeriodStats }) {
  const items: { key: keyof typeof DOCTOR_DONUT_COLORS; label: string; value: number }[] = [
    { key: "completed", label: "Completed", value: stats.completed },
    { key: "pending", label: "Pending", value: stats.pending },
    { key: "cancelled", label: "Cancelled", value: stats.cancelled },
    { key: "upcoming", label: "Upcoming", value: stats.upcoming },
  ];

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const pct = stats.total ? Math.round((item.value / stats.total) * 100) : 0;
        return (
          <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DOCTOR_DONUT_COLORS[item.key] }}
              />
              <span className="truncate text-[#374151]">{item.label}</span>
            </div>
            <span className="shrink-0 tabular-nums text-[#6b7177]">
              {item.value} ({pct}%)
            </span>
          </li>
        );
      })}
    </ul>
  );
}
