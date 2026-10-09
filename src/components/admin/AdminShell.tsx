"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "clinic-admin-sidebar-collapsed";
const SIDEBAR_EVENT = "clinic-sidebar-collapsed";

type AdminShellContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  sidebarWidth: number;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function useAdminShell() {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShell must be used within AdminShell");
  return ctx;
}

function subscribeCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

function getCollapsedSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getCollapsedServerSnapshot() {
  return false;
}

type Props = {
  children: React.ReactNode;
  clinicName?: string;
  logoUrl?: string | null;
  pendingReminderCount?: number;
  unreadMessageCount?: number;
  role?: string;
  allowedModules?: string[];
  providerType?: string | null;
};

export function AdminShell({
  children,
  clinicName,
  logoUrl,
  pendingReminderCount = 0,
  unreadMessageCount = 0,
  role,
  allowedModules = [],
  providerType,
}: Props) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("overflow-hidden");
    body.classList.add("overflow-hidden");
    return () => {
      html.classList.remove("overflow-hidden");
      body.classList.remove("overflow-hidden");
    };
  }, []);

  const toggleCollapsed = useCallback(() => {
    const next = !(window.localStorage.getItem(STORAGE_KEY) === "1");
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }, []);

  return (
    <AdminShellContext.Provider
      value={{ collapsed, toggleCollapsed, sidebarWidth: collapsed ? 72 : 248 }}
    >
      <div className="h-svh overflow-hidden bg-[#f5f7fb]">
        <AdminSidebar
          clinicName={clinicName}
          logoUrl={logoUrl}
          pendingReminderCount={pendingReminderCount}
          unreadMessageCount={unreadMessageCount}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          className="hidden lg:flex"
          role={role}
          allowedModules={allowedModules}
          providerType={providerType}
        />
        <div
          className={cn(
            "flex h-svh min-h-0 min-w-0 flex-col transition-[margin] duration-200 ease-out",
            mounted ? (collapsed ? "lg:ml-[72px]" : "lg:ml-[248px]") : "lg:ml-[248px]"
          )}
        >
          {children}
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}
