import { AppointmentBookingForm } from "@/components/site/AppointmentBookingForm";
import { formatLunchBreakLabel } from "@/lib/booking-slots";
import { getClinicSettings, listPublicDoctors } from "@/services/clinic.service";

export const metadata = { title: "Book appointment" };

export default async function AppointmentPage() {
  const settings = await getClinicSettings();
  const doctors = await listPublicDoctors(settings.clinicId);
  const lunchLabel = formatLunchBreakLabel(settings.lunchStartHour, settings.lunchEndHour);

  return (
    <section className="relative overflow-hidden bg-[#eef6fc]">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-[8%] size-40 rounded-full bg-[var(--brand-teal)]/10 blur-2xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16">
        <AppointmentBookingForm lunchBreakLabel={lunchLabel} doctors={doctors} />
      </div>
    </section>
  );
}