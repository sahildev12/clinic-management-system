import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PrescriptionForm } from "@/components/admin/PrescriptionForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadPrescriptionForm } from "@/controllers/admin.controller";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage() {
  await requireModulePage("prescriptions");
  const { patients, medicines, appointments } = await loadPrescriptionForm();

  return (
    <div>
      <AdminPageHeader title="New prescription" description="Add medicines, then print." />
      <PrescriptionForm patients={patients} medicines={medicines} appointments={appointments} />
    </div>
  );
}
