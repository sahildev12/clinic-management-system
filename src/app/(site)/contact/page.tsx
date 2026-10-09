import { SiteContact } from "@/components/site/SiteContact";
import { getClinicSettings } from "@/services/clinic.service";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await getClinicSettings();

  return (
    <SiteContact
      clinicName={settings.clinicName}
      phone={settings.phone}
      email={settings.email}
      address={settings.address}
      lunchStartHour={settings.lunchStartHour}
      lunchEndHour={settings.lunchEndHour}
    />
  );
}
