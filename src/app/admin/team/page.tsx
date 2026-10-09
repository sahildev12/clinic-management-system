import { TeamManager } from "@/components/admin/TeamManager";
import { requireAdminPage } from "@/lib/page-auth";
import { loadProvidersPage } from "@/controllers/admin.controller";

export const metadata = { title: "Doctors & team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireAdminPage();
  const search = await searchParams;
  const { providers } = await loadProvidersPage(search);
  const hasActiveFilters = Boolean(search.q?.trim());
  const canViewPassword = viewer.role === "ADMIN";

  return (
    <TeamManager
      members={providers}
      hasActiveFilters={hasActiveFilters}
      canViewPassword={canViewPassword}
    />
  );
}
