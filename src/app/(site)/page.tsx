import { SiteBlog } from "@/components/site/SiteBlog";
import { SiteClinicNumbers } from "@/components/site/SiteClinicNumbers";
import { SiteHero } from "@/components/site/SiteHero";
import { SiteNewsletter } from "@/components/site/SiteNewsletter";
import { SitePersonalCare } from "@/components/site/SitePersonalCare";
import { SiteTestimonials } from "@/components/site/SiteTestimonials";
import { SiteTreatments } from "@/components/site/SiteTreatments";
import { getClinicSettings } from "@/services/clinic.service";

export default async function HomePage() {
  const settings = await getClinicSettings();

  return (
    <>
      <SiteHero clinicName={settings.clinicName} phone={settings.phone} />
      <SiteTreatments />
      <SitePersonalCare clinicName={settings.clinicName} />
      <SiteTestimonials />
      <SiteClinicNumbers />
      <SiteBlog />
      <SiteNewsletter />
    </>
  );
}
