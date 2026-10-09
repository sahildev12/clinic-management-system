"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import type { StaffModuleKey } from "@/lib/staff-modules";
import { staffCanAccessPath, staffHomePath } from "@/lib/staff-modules";

/** Redirects STAFF away from pages outside their moduleAccess. */
export function StaffRouteGuard({
  role,
  modules,
  providerType,
  children,
}: {
  role: string;
  modules: StaffModuleKey[];
  providerType?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (role !== "STAFF") return;
    if (staffCanAccessPath(pathname, modules, providerType)) return;
    const home = staffHomePath(modules);
    if (home === "/login") {
      router.replace("/team/login");
      return;
    }
    if (pathname !== home) router.replace(home);
  }, [role, modules, pathname, providerType, router]);

  if (role === "STAFF" && !staffCanAccessPath(pathname, modules, providerType)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
