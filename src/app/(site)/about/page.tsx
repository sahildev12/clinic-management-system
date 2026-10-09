import { SiteAbout } from "@/components/site/SiteAbout";
import {
  BOOKING_DAY_END_HOUR,
  BOOKING_DAY_START_HOUR,
  formatHourLabel,
} from "@/lib/booking-slots";
import { getClinicSettings } from "@/services/clinic.service";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const settings = await getClinicSettings();
  const hoursLabel = `Mon – Sat · ${formatHourLabel(BOOKING_DAY_START_HOUR)} – ${formatHourLabel(
    BOOKING_DAY_END_HOUR
  )}`;

  return (
    <SiteAbout
      clinicName={settings.clinicName}
      address={settings.address}
      hoursLabel={hoursLabel}
    />
  );
}
