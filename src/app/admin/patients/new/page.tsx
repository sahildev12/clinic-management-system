import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PatientForm } from "@/components/admin/PatientForm";
import { requireModulePage } from "@/lib/page-auth";

export const metadata = { title: "New patient" };

export default async function NewPatientPage() {
  await requireModulePage("patients");

  return (
    <div>
      <AdminPageHeader
        title="New patient"
        description="Create a patient and optionally book their visit."
      />
      <PatientForm />
    </div>
  );
}
