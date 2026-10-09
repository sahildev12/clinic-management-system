/** Modules an admin can grant to team (STAFF) members. Team & Settings stay admin-only. */
export const STAFF_MODULE_OPTIONS = [
  { key: "dashboard", label: "Dashboard", href: "/admin", exact: true },
  { key: "patients", label: "Patients", href: "/admin/patients" },
  { key: "appointments", label: "Appointments", href: "/admin/appointments" },
  { key: "notes", label: "Notes", href: "/admin/notes" },
  { key: "payments", label: "Payments", href: "/admin/payments" },
  { key: "finance", label: "Finance", href: "/admin/finance" },
  { key: "reminders", label: "Reminders", href: "/admin/reminders" },
  { key: "prescriptions", label: "Prescriptions", href: "/admin/prescriptions" },
  { key: "medicines", label: "Medicines", href: "/admin/medicines" },
  { key: "messages", label: "Messages", href: "/admin/messages" },
  { key: "media", label: "Media", href: "/admin/media" },
] as const;

export type StaffModuleKey = (typeof STAFF_MODULE_OPTIONS)[number]["key"];

export const STAFF_MODULE_KEYS = STAFF_MODULE_OPTIONS.map((m) => m.key) as StaffModuleKey[];

export const DEFAULT_STAFF_MODULES: StaffModuleKey[] = ["dashboard", "patients", "appointments", "payments"];

/** Admin-only nav keys (never granted to staff). */
export const ADMIN_ONLY_NAV_HREFS = ["/admin/team", "/admin/settings"] as const;

/** Doctor-only pages (not tied to module grants). */
export const DOCTOR_ONLY_NAV_HREFS = ["/admin/my-schedule"] as const;

export function isStaffModuleKey(value: string): value is StaffModuleKey {
  return (STAFF_MODULE_KEYS as string[]).includes(value);
}

export function sanitizeStaffModules(keys: string[] | null | undefined): StaffModuleKey[] {
  if (!keys?.length) return [];
  const unique = new Set<StaffModuleKey>();
  for (const key of keys) {
    if (isStaffModuleKey(key)) unique.add(key);
  }
  return [...unique];
}

export function staffHomePath(modules: StaffModuleKey[]): string {
  const ordered = STAFF_MODULE_OPTIONS.filter((m) => modules.includes(m.key));
  return ordered[0]?.href ?? "/login";
}

export function staffCanAccessPath(
  pathname: string,
  modules: StaffModuleKey[],
  providerType?: string | null
): boolean {
  if (modules.length === 0) return false;

  if (providerType === "DOCTOR") {
    for (const href of DOCTOR_ONLY_NAV_HREFS) {
      if (pathname === href || pathname.startsWith(`${href}/`)) return true;
    }
  }

  // From patient tracking, staff with Patients access can open related print slips
  // even when the Prescriptions / Appointments modules are not granted.
  if (modules.includes("patients")) {
    if (/^\/admin\/prescriptions\/[^/]+\/print\/?$/.test(pathname)) return true;
    if (/^\/admin\/appointments\/[^/]+\/print\/?$/.test(pathname)) return true;
  }

  if (pathname === "/admin/notes" || pathname.startsWith("/admin/notes/")) {
    return modules.includes("notes") || modules.includes("appointments");
  }

  for (const mod of STAFF_MODULE_OPTIONS) {
    if (!modules.includes(mod.key)) continue;
    if ("exact" in mod && mod.exact) {
      if (pathname === mod.href) return true;
    } else if (pathname === mod.href || pathname.startsWith(`${mod.href}/`)) {
      return true;
    }
  }
  return false;
}

export function navHrefAllowedForStaff(
  href: string,
  modules: StaffModuleKey[],
  providerType?: string | null
): boolean {
  if ((ADMIN_ONLY_NAV_HREFS as readonly string[]).includes(href)) return false;
  if (href === "/admin/notes") {
    return modules.includes("notes") || modules.includes("appointments");
  }
  if ((DOCTOR_ONLY_NAV_HREFS as readonly string[]).includes(href)) {
    return providerType === "DOCTOR";
  }
  const mod = STAFF_MODULE_OPTIONS.find((m) => m.href === href);
  if (!mod) return false;
  return modules.includes(mod.key);
}
