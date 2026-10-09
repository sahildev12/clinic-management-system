import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReminderForm } from "@/components/admin/ReminderForm";
import { requireModulePage } from "@/lib/page-auth";
import { loadRemindersPage } from "@/controllers/admin.controller";

export const metadata = { title: "New reminder" };

export default async function NewReminderPage() {
  await requireModulePage("reminders");
  const { patients, appointments } = await loadRemindersPage();

  return (
    <div>
      <AdminPageHeader title="New reminder" />
      <ReminderForm patients={patients} appointments={appointments} />
    </div>
  );
}
