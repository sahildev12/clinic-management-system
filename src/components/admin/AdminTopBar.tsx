"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarPlus, Menu } from "lucide-react";

import { AdminPatientSearch } from "@/components/admin/AdminPatientSearch";
import { adminNavItems, doctorNavItems } from "@/config/admin-nav";
import { doctorCategoryLabel } from "@/lib/doctor-categories";
import { useAdminShell } from "@/components/admin/AdminShell";
import { initials } from "@/lib/admin-format";
import { avatarColorsForName } from "@/lib/admin-avatars";
import { navHrefAllowedForStaff, type StaffModuleKey } from "@/lib/staff-modules";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  userEmail: string;
  role: string;
  allowedModules?: string[];
  unreadMessageCount?: number;
  providerType?: string | null;
  specialization?: string | null;
};

export function AdminTopBar({
  userName,
  role,
  allowedModules = [],
  unreadMessageCount = 0,
  providerType,
  specialization,
}: Props) {
  const pathname = usePathname();
  const { toggleCollapsed } = useAdminShell();
  const userColors = avatarColorsForName(userName);
  const modules = allowedModules as StaffModuleKey[];
  const isDoctor = providerType === "DOCTOR";
  const mobileNav =
    role === "STAFF"
      ? (isDoctor ? doctorNavItems : adminNavItems).filter(
          (item) => !item.adminOnly && navHrefAllowedForStaff(item.href.split("?")[0] ?? item.href, modules, providerType)
        )
      : adminNavItems.filter((item) => !item.adminOnly || role === "ADMIN");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#e3e3e3] bg-white px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] text-[#6b7177] transition-colors hover:bg-white hover:text-[#1a1a1a] lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="size-4" aria-hidden />
          </button>
          {isDoctor ? (
            <AdminPatientSearch />
          ) : (
            <Link
              href="/admin/appointments?new=1"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#b8ebe4] bg-[#e6fbf9] px-3.5 text-sm font-medium text-[var(--brand-teal-dark)] transition-colors hover:bg-[#d2f7f3]"
            >
              <CalendarPlus className="size-4" aria-hidden />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin/messages"
            className="relative inline-flex size-9 items-center justify-center rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] text-[#6b7177] transition-colors hover:bg-white hover:text-[#1a1a1a]"
            aria-label="Messages"
          >
            <Bell className="size-4" aria-hidden />
            {unreadMessageCount > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--brand-teal)] px-1 text-[10px] font-bold text-white">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </span>
            ) : null}
          </Link>
          <Link
            href={isDoctor ? "/admin/my-schedule" : "/admin/settings"}
            aria-label="Account settings"
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f6f6f7]"
          >
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: userColors.bg, color: userColors.fg }}
            >
              {initials(userName)}
            </span>
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-medium text-[#1a1a1a]">
                {isDoctor ? `Dr. ${userName}` : userName}
              </p>
              <p className="truncate text-xs text-[#6b7177]">
                {isDoctor
                  ? doctorCategoryLabel(specialization)
                  : role === "ADMIN"
                    ? "Admin"
                    : "Staff"}
              </p>
            </div>
          </Link>
        </div>
      </header>

      <nav
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#e3e3e3] bg-white px-3 py-2 lg:hidden"
        aria-label="Admin mobile"
      >
        {mobileNav.map((item) => {
          const hrefPath = item.href.split("?")[0] ?? item.href;
          const active = item.exact
            ? pathname === hrefPath
            : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[var(--brand-teal)] text-white"
                  : "bg-[#f6f6f7] text-[#1a1a1a] hover:bg-[#ebebeb]"
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
