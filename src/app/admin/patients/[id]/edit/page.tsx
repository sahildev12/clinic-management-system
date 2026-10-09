import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PatientForm } from "@/components/admin/PatientForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadPatientForm } from "@/controllers/admin.controller";

export const metadata = { title: "Edit patient" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModulePage("patients");
  const { id } = await params;
  const patient = await loadPatientForm(id);
  if (!patient) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit patient" description={patient.name} />
      <PatientForm patient={patient} />
    </div>
  );
}
