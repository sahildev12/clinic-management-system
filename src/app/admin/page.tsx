import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  MessageSquare,
  Pill,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import {
  appointmentSourceLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import { DoctorDashboard } from "@/components/admin/doctor/DoctorDashboard";
import { requireModulePage } from "@/lib/page-auth";
import type { StaffModuleKey } from "@/lib/staff-modules";
import { cn } from "@/lib/utils";
import { loadAdminDashboard } from "@/controllers/admin.controller";

export const metadata = { title: "Dashboard" };

const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 shadow-sm transition-colors hover:border-[color-mix(in_oklab,var(--brand-teal)_35%,#e3e3e3)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#6b7177]">{hint}</p> : null}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

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
        "overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1a1a1a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="px-4 py-8 text-center text-sm text-[#6b7177]">{message}</p>;
}

function hasModule(modules: StaffModuleKey[], key: StaffModuleKey, isStaff: boolean) {
  if (!isStaff) return true;
  return modules.includes(key);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ clinicId?: string }>;
}) {
  await requireModulePage("dashboard");
  const search = await searchParams;
  const { stats, isStaff, isDoctor, doctorProfile, modules } = await loadAdminDashboard(search);

  if (isDoctor && doctorProfile) {
    return <DoctorDashboard stats={stats} doctorProfile={doctorProfile} />;
  }

  const maxWeekAmount = Math.max(
    ...stats.last7DaysCollections.map((day) => day.amount),
    1
  );
  const monthAppointmentTotal = Object.values(stats.monthStatusCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const attentionItems = [
    {
      module: "reminders" as const,
      label: "Overdue reminders",
      value: stats.overdueReminders,
      href: "/admin/reminders?status=PENDING",
      icon: AlertTriangle,
    },
    {
      module: "messages" as const,
      label: "Unread messages",
      value: stats.unreadMessages,
      href: "/admin/messages",
      icon: MessageSquare,
    },
    {
      module: "medicines" as const,
      label: "Low-stock medicines",
      value: stats.lowStockMedicines.length,
      href: "/admin/medicines",
      icon: Pill,
    },
  ].filter((item) => hasModule(modules, item.module, isStaff));

  const quickActions = [
    {
      module: "appointments" as const,
      href: "/admin/appointments?new=1",
      label: "New appointment",
      icon: CalendarDays,
    },
    {
      module: "patients" as const,
      href: "/admin/patients?new=1",
      label: "Add patient",
      icon: UserPlus,
    },
    {
      module: "payments" as const,
      href: "/admin/payments?new=1",
      label: "Record payment",
      icon: IndianRupee,
    },
    {
      module: "prescriptions" as const,
      href: "/admin/prescriptions?new=1",
      label: "New prescription",
      icon: Plus,
    },
  ].filter((action) => hasModule(modules, action.module, isStaff));

  const showMedicinesDetail =
    hasModule(modules, "medicines", isStaff) && stats.lowStockMedicines.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description={
          isStaff
            ? "Your day at the clinic."
            : "Daily operations and clinic performance at a glance."
        }
      />

      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          isStaff ? "xl:grid-cols-2" : "xl:grid-cols-4"
        )}
      >
        <KpiCard
          label="Today’s appointments"
          value={String(stats.todayAppointmentCount)}
          hint={`${stats.todayStatusCounts.PENDING} pending · ${stats.todayStatusCounts.CONFIRMED} confirmed`}
          href="/admin/appointments"
        />
        {!isStaff ? (
          <>
            <KpiCard
              label="Today’s collection"
              value={formatCurrency(stats.todayCollection)}
              hint={`${stats.todayPaymentCount} payment${stats.todayPaymentCount === 1 ? "" : "s"}`}
              href="/admin/payments"
            />
            <KpiCard
              label="Month collection"
              value={formatCurrency(stats.monthCollection)}
              hint={`${stats.monthPaymentCount} payment${stats.monthPaymentCount === 1 ? "" : "s"}`}
              href="/admin/payments"
            />
            <KpiCard
              label="Patients"
              value={String(stats.patientCount)}
              hint={`${stats.newPatientsThisMonth} new this month`}
              href="/admin/patients"
            />
          </>
        ) : null}
      </div>

      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                adminPrimaryButtonClassName("h-9 px-3 text-sm"),
                "bg-white text-[#1a1a1a] ring-1 ring-[#e3e3e3] hover:bg-[#fafafa] hover:opacity-100"
              )}
            >
              <action.icon className="size-4 text-[var(--brand-teal)]" />
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <Widget
          className="xl:col-span-3"
          title="Today’s schedule"
          action={
            <Link
              href="/admin/appointments"
              className="text-sm font-medium text-[var(--brand-teal)] hover:underline"
            >
              View all
            </Link>
          }
        >
          {stats.todayAppointments.length === 0 ? (
            <EmptyRow message="No appointments scheduled today." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.todayAppointments.map((appt) => (
                <li
                  key={appt.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1a1a1a]">
                      {appt.patient.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#6b7177]">
                      {appt.patient.patientReference} · {formatDateTime(appt.dateTime)} ·{" "}
                      {appointmentSourceLabel(appt.source)}
                    </p>
                  </div>
                  <AdminStatusPill status={appt.status} />
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          className="xl:col-span-2"
          title="Needs attention"
          action={
            hasModule(modules, "reminders", isStaff) ? (
              <span className="text-xs font-medium text-[#6b7177]">
                {stats.pendingReminders} pending reminders
              </span>
            ) : null
          }
        >
          {attentionItems.length === 0 ? (
            <EmptyRow message="Nothing needs attention right now." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {attentionItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#6b7177]">
                        <item.icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-[#1a1a1a]">{item.label}</span>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
                        item.value > 0
                          ? "bg-red-50 text-red-600"
                          : "bg-[#f3f4f6] text-[#6b7177]"
                      )}
                    >
                      {item.value}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showMedicinesDetail ? (
            <div className="border-t border-[#ebebeb] px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
                Lowest stock
              </p>
              <ul className="space-y-2">
                {stats.lowStockMedicines.slice(0, 4).map((medicine) => (
                  <li
                    key={medicine.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate text-[#1a1a1a]">
                      {medicine.name}
                      {medicine.strength ? (
                        <span className="text-[#6b7177]"> ({medicine.strength})</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-red-600">
                      {medicine.stock}
                      {medicine.unit ? ` ${medicine.unit}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Widget>
      </div>

      <div className={cn("grid gap-4", isStaff ? "xl:grid-cols-1" : "xl:grid-cols-5")}>
        {!isStaff ? (
          <Widget
            className="xl:col-span-3"
            title="Collections · last 7 days"
            action={
              <Link
                href="/admin/payments"
                className="text-sm font-medium text-[var(--brand-teal)] hover:underline"
              >
                Payments
              </Link>
            }
          >
            <div className="px-4 py-4">
              <div
                className="flex h-40 items-end gap-2"
                role="img"
                aria-label={`Collections for the last 7 days. ${stats.last7DaysCollections
                  .map((day) => `${day.label}: ${formatCurrency(day.amount)}`)
                  .join("; ")}`}
              >
                {stats.last7DaysCollections.map((day) => {
                  const height = Math.max(
                    (day.amount / maxWeekAmount) * 100,
                    day.amount > 0 ? 8 : 2
                  );
                  return (
                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end justify-center">
                        <div
                          className="w-full max-w-10 rounded-t-md bg-[var(--brand-teal)]/85"
                          style={{ height: `${height}%` }}
                          title={`${day.label}: ${formatCurrency(day.amount)}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-medium text-[#6b7177]">{day.label}</p>
                        <p className="text-[10px] tabular-nums text-[#9ca3af]">
                          {day.amount > 0 ? formatCurrency(day.amount) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Widget>
        ) : null}

        <Widget
          className={isStaff ? undefined : "xl:col-span-2"}
          title="Appointments this month"
        >
          {monthAppointmentTotal === 0 ? (
            <EmptyRow message="No appointments recorded this month." />
          ) : (
            <ul
              className="space-y-3 px-4 py-4"
              aria-label={`Appointments this month by status. Total ${monthAppointmentTotal}.`}
            >
              {STATUS_ORDER.map((status) => {
                const count = stats.monthStatusCounts[status];
                const pct = monthAppointmentTotal
                  ? Math.round((count / monthAppointmentTotal) * 100)
                  : 0;
                return (
                  <li key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <AdminStatusPill status={status} />
                      <span className="text-xs font-medium tabular-nums text-[#6b7177]">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                      <div
                        className="h-full rounded-full bg-[var(--brand-teal)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Widget>
      </div>

      {!isStaff ? (
        <Widget
          title="Recent patients"
          action={
            <Link
              href="/admin/patients"
              className="text-sm font-medium text-[var(--brand-teal)] hover:underline"
            >
              View all
            </Link>
          }
        >
          {stats.recentPatients.length === 0 ? (
            <EmptyRow message="No patients yet." />
          ) : (
            <ul className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentPatients.map((patient) => (
                <li
                  key={patient.id}
                  className="border-t border-[#f0f0f0] sm:border-r sm:odd:border-l-0"
                >
                  <Link
                    href={`/admin/patients/${patient.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa]"
                  >
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--brand-teal)_12%,white)] text-[var(--brand-teal)]">
                      <Users className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#1a1a1a]">{patient.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[#6b7177]">
                        {patient.patientReference} · {patient.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">
                        Added {formatDate(patient.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      ) : null}
    </div>
  );
}
