"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { adminNavItems, doctorNavItems } from "@/config/admin-nav";
import { navHrefAllowedForStaff, type StaffModuleKey } from "@/lib/staff-modules";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  clinicName?: string;
  logoUrl?: string | null;
  pendingReminderCount?: number;
  unreadMessageCount?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
  role?: string;
  allowedModules?: string[];
  providerType?: string | null;
};

export function AdminSidebar({
  clinicName = "CarePlus Clinic",
  logoUrl,
  pendingReminderCount = 0,
  unreadMessageCount = 0,
  collapsed,
  onToggleCollapse,
  className,
  role,
  allowedModules = [],
  providerType,
}: Props) {
  const pathname = usePathname();
  const signOutUrl =
    role === "STAFF" && providerType === "DOCTOR" ? "/doctor/login" : role === "STAFF" ? "/team/login" : "/login";
  const modules = allowedModules as StaffModuleKey[];
  const navSource = providerType === "DOCTOR" ? doctorNavItems : adminNavItems;
  const visibleNav =
    role === "STAFF"
      ? navSource.filter((item) => {
          if (item.adminOnly) return false;
          if (providerType !== "DOCTOR" && item.doctorOnly) return false;
          if (providerType === "DOCTOR") {
            if (item.href === "/admin" || item.href === "/admin/my-schedule") return true;
            if (item.href === "/admin/notes") {
              return modules.includes("notes") || modules.includes("appointments");
            }
            if (item.href.startsWith("/admin/patients")) {
              return modules.includes("patients");
            }
            return navHrefAllowedForStaff(
              item.href.split("?")[0] ?? item.href,
              modules,
              providerType
            );
          }
          return navHrefAllowedForStaff(item.href, modules, providerType);
        })
      : adminNavItems.filter((item) => !item.doctorOnly && (!item.adminOnly || role === "ADMIN"));

  const logo = logoUrl?.trim();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/10 bg-[#1a1a1a] text-[#e3e3e3] transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-[248px]",
        className
      )}
      aria-label="Admin navigation"
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-white/10",
          collapsed ? "h-[72px] justify-center px-2" : "h-[72px] justify-between gap-2 px-4"
        )}
      >
        <Link
          href="/admin"
          className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}
          title={clinicName}
        >
          {logo ? (
            <span className="relative inline-flex size-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="size-full object-cover" />
            </span>
          ) : (
            <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-teal)] text-sm font-bold text-white">
              <span className="absolute h-4 w-1 rounded-full bg-white" />
              <span className="absolute h-1 w-4 rounded-full bg-white" />
            </span>
          )}
          {!collapsed ? (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-white">{clinicName}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Admin Portal
              </p>
            </div>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex shrink-0 justify-center border-b border-white/10 py-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex size-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Admin menu"
      >
        <ul className="space-y-0.5">
          {visibleNav.map((item) => {
            const hrefPath = item.href.split("?")[0] ?? item.href;
            const active = isActive(pathname, hrefPath, item.exact);
            const Icon = item.icon;
            let badge = item.badge;
            if (item.href === "/admin/reminders" && pendingReminderCount > 0) {
              badge = String(pendingReminderCount > 99 ? "99+" : pendingReminderCount);
            }
            if (item.href === "/admin/messages" && unreadMessageCount > 0) {
              badge = String(unreadMessageCount > 99 ? "99+" : unreadMessageCount);
            }

            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-[var(--brand-teal)] text-white"
                      : "text-[#b5b5b5] hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="size-[18px] shrink-0 opacity-95" aria-hidden />
                  {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                  {!collapsed && badge ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-white/10 text-white/90"
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: signOutUrl })}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-white/8",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <LogOut className="size-[18px] shrink-0" aria-hidden />
          {!collapsed ? "Sign out" : null}
        </button>
      </div>
    </aside>
  );
}
