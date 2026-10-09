import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadAppointmentForm } from "@/controllers/admin.controller";

export const metadata = { title: "New appointment" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clinicId?: string }>;
}) {
  await requireModulePage("appointments");
  const search = await searchParams;
  const { patients, providers } = await loadAppointmentForm(undefined, search);

  return (
    <div>
      <AdminPageHeader title="New appointment" />
      <AppointmentForm patients={patients} providers={providers} />
    </div>
  );
}
