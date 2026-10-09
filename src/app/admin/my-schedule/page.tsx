import { DoctorScheduleForm } from "@/components/admin/DoctorScheduleForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const metadata = {
  title: "Settings",
};

export default function MySchedulePage() {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <AdminPageHeader
        title="Settings"
        description="Set your appointment length, working days, and available hours."
      />
      <div className="rounded-xl border border-[#e3e3e3] bg-white p-4 md:p-6">
        <DoctorScheduleForm />
      </div>
    </div>
  );
}
