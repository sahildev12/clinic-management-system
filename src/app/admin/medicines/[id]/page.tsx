import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MedicineForm } from "@/components/admin/MedicineForm";
import { MedicineInventoryPanel } from "@/components/admin/MedicineInventoryPanel";
import { requireModulePage } from "@/lib/page-auth";
import { loadMedicineDetail } from "@/controllers/admin.controller";

export const metadata = { title: "Edit medicine" };

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModulePage("medicines");
  const { id } = await params;
  const { medicine, transactions } = await loadMedicineDetail(id);
  if (!medicine) notFound();

  return (
    <div>
      <AdminPageHeader title="Edit medicine" description={medicine.name} />
      <MedicineForm medicine={medicine} />
      <MedicineInventoryPanel
        medicineId={medicine.id}
        currentStock={medicine.stock}
        transactions={transactions}
      />
    </div>
  );
}
