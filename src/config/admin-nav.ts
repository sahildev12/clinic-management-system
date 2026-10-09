import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  Images,
  LayoutDashboard,
  Mail,
  Pill,
  Settings,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  adminOnly?: boolean;
  doctorOnly?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Doctors & team", href: "/admin/team", icon: UserRound, adminOnly: true },
  { label: "Payments", href: "/admin/payments", icon: Banknote },
  { label: "Finance", href: "/admin/finance", icon: TrendingUp },
  { label: "Reminders", href: "/admin/reminders", icon: Bell },
  { label: "Notes", href: "/admin/notes", icon: FileText },
  { label: "Prescriptions", href: "/admin/prescriptions", icon: Stethoscope },
  { label: "Medicines", href: "/admin/medicines", icon: Pill },
  { label: "Messages", href: "/admin/messages", icon: Mail },
  { label: "Media", href: "/admin/media", icon: Images },
  { label: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
  { label: "Settings", href: "/admin/my-schedule", icon: Settings, doctorOnly: true },
];

/** Navigation shown to logged-in doctors (STAFF + providerType DOCTOR). */
export const doctorNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "My Appointments", href: "/admin/appointments", icon: CalendarDays },
  { label: "Patients", href: "/admin/patients", icon: Users },
  { label: "Prescriptions", href: "/admin/prescriptions", icon: Stethoscope },
  { label: "Notes", href: "/admin/notes", icon: FileText },
  {
    label: "Medical Records",
    href: "/admin/patients?view=medical",
    icon: ClipboardList,
    doctorOnly: true,
  },
  { label: "Profile", href: "/admin/my-schedule", icon: UserRound, doctorOnly: true },
  { label: "Settings", href: "/admin/my-schedule", icon: Settings, doctorOnly: true },
];
