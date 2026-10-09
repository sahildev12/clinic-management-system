"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { DonutChart, DonutLegend } from "@/components/admin/doctor/DonutChart";
import {
  DOCTOR_STATS_PERIOD_OPTIONS,
  type DoctorPeriodStats,
  type DoctorStatsPeriod,
} from "@/lib/doctor-dashboard";

type Props = {
  periodStats: Record<DoctorStatsPeriod, DoctorPeriodStats>;
  initialPeriod?: DoctorStatsPeriod;
};

export function DoctorAppointmentStatsCard({
  periodStats,
  initialPeriod = "week",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get("statsPeriod") as DoctorStatsPeriod) || initialPeriod;
  const stats = periodStats[period] ?? periodStats.week;

  function setPeriod(next: DoctorStatsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("statsPeriod", next);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-end">
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as DoctorStatsPeriod)}
          className="h-8 rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] px-2 text-xs font-medium text-[#374151] outline-none focus:border-[var(--brand-teal)]"
          aria-label="Statistics period"
        >
          {DOCTOR_STATS_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {stats.total === 0 ? (
        <p className="py-8 text-center text-sm text-[#6b7177]">
          No appointment data available for this period.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
          <DonutChart stats={stats} />
          <DonutLegend stats={stats} />
        </div>
      )}
    </div>
  );
}
