import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadAppointmentForm } from "@/controllers/admin.controller";

export const metadata = { title: "Edit appointment" };

export default async function EditAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clinicId?: string }>;
}) {
  await requireModulePage("appointments");
  const { id } = await params;
  const search = await searchParams;
  const { appointment, patients, providers } = await loadAppointmentForm(id, search);
  if (!appointment) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit appointment" description={appointment.patient.name} />
      <AppointmentForm appointment={appointment} patients={patients} providers={providers} />
    </div>
  );
}
