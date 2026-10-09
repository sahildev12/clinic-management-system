import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import {
  DoctorDashboardCalendar,
  type DashboardCalendarAppointment,
} from "@/components/admin/doctor/DoctorDashboardCalendar";
import { DoctorNotesRemindersPanel } from "@/components/admin/doctor/DoctorNotesRemindersPanel";
import { DoctorRecentPatientsPanel } from "@/components/admin/doctor/DoctorRecentPatientsPanel";
import { toDateKey } from "@/lib/appointment-calendar";
import { formatDoctorDisplayDate, timeGreeting } from "@/lib/doctor-dashboard";
import { cn } from "@/lib/utils";
import type { getDashboardStats } from "@/services/clinic.service";

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

type DoctorProfile = {
  name: string;
  specialization: string;
  providerId: string | null;
};

type Props = {
  stats: DashboardStats;
  doctorProfile: DoctorProfile;
};

function Widget({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "teal" | "amber" | "green" | "red";
}) {
  const tones = {
    teal: "border-[#c8ebe4] bg-[linear-gradient(180deg,#f4fbf9_0%,#ffffff_100%)] text-[var(--brand-teal-dark)]",
    amber: "border-[#f0dfa8] bg-[linear-gradient(180deg,#fffbf0_0%,#ffffff_100%)] text-amber-700",
    green: "border-[#b8dfc4] bg-[linear-gradient(180deg,#f2faf4_0%,#ffffff_100%)] text-emerald-700",
    red: "border-[#f0caca] bg-[linear-gradient(180deg,#fef6f6_0%,#ffffff_100%)] text-red-700",
  };

  return (
    <Link href={href} className="block h-full">
      <div
        className={cn(
          "h-full rounded-xl border p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md",
          tones[tone]
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/80 shadow-sm">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums text-[#111827]">{value}</p>
        <p className="mt-1 text-xs text-[#6b7177]">{hint}</p>
      </div>
    </Link>
  );
}

export function DoctorDashboard({ stats, doctorProfile }: Props) {
  const todayKey = toDateKey(new Date());
  const firstName = doctorProfile.name.split(/\s+/)[0] ?? doctorProfile.name;
  const todayHref = `/admin/appointments?view=day&anchor=${todayKey}`;

  const calendarAppointments: DashboardCalendarAppointment[] = stats.todayAppointments.map(
    (appt) => ({
      id: appt.id,
      dateTime: appt.dateTime.toISOString(),
      durationMinutes: appt.durationMinutes,
      status: appt.status,
      source: appt.source,
      notes: appt.notes,
      patient: { name: appt.patient.name },
    })
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            {timeGreeting()}, Dr. {firstName} ☀️
          </h1>
          <p className="mt-1 text-sm text-[#6b7177]">
            Here&apos;s your schedule and patient overview for today.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold text-[#111827]">{formatDoctorDisplayDate()}</p>
          <p className="mt-0.5 text-xs text-[#6b7177]">Have a great day!</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's Appointments"
          value={stats.todayAppointmentCount}
          hint="Total appointments scheduled for today"
          href={todayHref}
          icon={CalendarDays}
          tone="teal"
        />
        <KpiCard
          label="Pending Appointments"
          value={stats.todayStatusCounts.PENDING}
          hint="Awaiting confirmation"
          href={`/admin/appointments?status=PENDING&view=day&anchor=${todayKey}`}
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Completed Today"
          value={stats.todayStatusCounts.COMPLETED}
          hint="Appointments completed today"
          href={`/admin/appointments?status=COMPLETED&view=day&anchor=${todayKey}`}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Cancelled"
          value={stats.todayStatusCounts.CANCELLED}
          hint="Cancelled appointments today"
          href={`/admin/appointments?status=CANCELLED&view=day&anchor=${todayKey}`}
          icon={XCircle}
          tone="red"
        />
      </div>

      <Widget
        title="Today's Calendar"
        action={
          <Link href={todayHref} className="text-sm font-medium text-[var(--brand-teal)] hover:underline">
            View all
          </Link>
        }
      >
        <DoctorDashboardCalendar
          initialDate={todayKey}
          initialAppointments={calendarAppointments}
        />
      </Widget>

      <div className="grid gap-4 xl:grid-cols-2">
        <Widget
          title="Recent Patients"
          action={
            <Link href="/admin/patients" className="text-sm font-medium text-[var(--brand-teal)] hover:underline">
              View all
            </Link>
          }
        >
          <DoctorRecentPatientsPanel patients={stats.doctorRecentPatients} />
        </Widget>

        <Widget
          title="Notes & Reminders"
          action={
            <Link href="/admin/notes" className="text-sm font-medium text-[var(--brand-teal)] hover:underline">
              View all
            </Link>
          }
        >
          <DoctorNotesRemindersPanel items={stats.doctorReminders} />
        </Widget>
      </div>
    </div>
  );
}
