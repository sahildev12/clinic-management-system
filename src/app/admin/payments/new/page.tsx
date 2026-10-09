import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadPaymentsPage } from "@/controllers/admin.controller";

export const metadata = { title: "Record payment" };

export default async function NewPaymentPage() {
  await requireModulePage("payments");
  const { patients, appointments } = await loadPaymentsPage();

  return (
    <div>
      <AdminPageHeader title="Record payment" />
      <PaymentForm patients={patients} appointments={appointments} />
    </div>
  );
}
