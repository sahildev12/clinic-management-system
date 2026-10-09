import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MedicineForm } from "@/components/admin/MedicineForm";
import { requireModulePage } from "@/lib/page-auth";

export const metadata = { title: "New medicine" };

export default async function NewMedicinePage() {
  await requireModulePage("medicines");

  return (
    <div>
      <AdminPageHeader title="New medicine" />
      <MedicineForm />
    </div>
  );
}
