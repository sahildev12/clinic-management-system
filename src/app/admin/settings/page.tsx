import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/page-auth";
import { loadSettingsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ clinicId?: string }>;
}) {
  await requireAdminPage();
  const search = await searchParams;
  const { settings } = await loadSettingsPage(search);

  return (
    <div>
      <AdminPageHeader
        title="Clinic settings"
        description="General clinic details, header branding, hours, and patient reference options."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
