import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { DoctorProfileCard } from "@/components/site/hero/DoctorProfileCard";
import { FeatureStrip } from "@/components/site/hero/FeatureStrip";
import { HeroCurveDefs } from "@/components/site/hero/HeroCurveMask";
import { ToothIcon } from "@/components/site/hero/ToothIcon";
import { TrustIndicators } from "@/components/site/hero/TrustIndicators";
import { heroDoctor, heroDoctorImageGuide } from "@/config/hero";
import { getVersionedPublicImageUrl } from "@/lib/hero-image";
import { cn } from "@/lib/utils";

type Props = {
  clinicName: string;
};

export function HeroSection({ clinicName }: Props) {
  const eyebrow = clinicName.toUpperCase();
  const doctorImageSrc = getVersionedPublicImageUrl(heroDoctor.image);

  return (
    <section className="hero-section w-full">
      <HeroCurveDefs />

      <div className="hero-main relative w-full flex-1 overflow-hidden bg-[var(--hero-bg)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="hero-bg-glow-left" />
          <div className="hero-bg-glow-mid" />
        </div>

        {/* Left content */}
        <div className="relative z-10 px-4 py-8 sm:px-6 lg:flex lg:h-full lg:w-[45%] lg:items-center lg:py-10">
          <div className="mx-auto w-full max-w-[640px] lg:ml-auto lg:max-w-none lg:pl-[max(1.5rem,calc((100vw-1400px)/2+2.5rem))] lg:pr-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--hero-accent)] sm:text-[13px]">
              {eyebrow}
            </p>

            <h1 className="mt-3 max-w-[18rem] font-heading text-[2.35rem] font-semibold leading-[1.02] tracking-tight text-[var(--hero-navy)] sm:max-w-none sm:text-[2.6rem] lg:text-[2.9rem] xl:text-[3.15rem]">
              Better Care.
              <br />
              Brighter{" "}
              <span className="text-[var(--hero-accent)]">Smiles.</span>
            </h1>

            <p className="mt-4 max-w-md text-[15px] leading-7 text-[#5c6f86] sm:text-base">
              We provide advanced dental care with a gentle touch.
              <br className="hidden sm:block" />
              From routine cleanings to complete smile makeovers — your comfort and health are our
              top priority.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/appointment"
                className="inline-flex h-11 items-center gap-2.5 rounded-full bg-[var(--hero-teal)] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,197,188,0.28)] transition hover:bg-[#0fb5ad] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hero-teal)]"
              >
                <CalendarDays className="size-4.5" aria-hidden />
                Book Appointment
              </Link>
              <Link
                href="/services"
                className="inline-flex h-11 items-center gap-2.5 rounded-full border border-[#c8dff0] bg-white px-6 text-sm font-bold text-[var(--hero-navy)] shadow-sm transition hover:border-[var(--hero-accent)] hover:bg-[#f8fcff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hero-accent)]"
              >
                <ToothIcon className="size-5 shrink-0 text-[var(--hero-accent)]" />
                View Treatments
              </Link>
            </div>

            <div className="mt-6">
              <TrustIndicators />
            </div>
          </div>
        </div>

        {/* Right image — C-curve clip via SVG, full bleed right */}
        <div className="hero-image-column relative mt-5 min-h-[320px] sm:min-h-[360px] lg:mt-0">
          <div className="hero-image-shell relative overflow-hidden">
            <div className="hero-doctor-image-wrap">
              <Image
                src={doctorImageSrc}
                alt={heroDoctor.imageAlt}
                width={heroDoctorImageGuide.portrait.width}
                height={heroDoctorImageGuide.portrait.height}
                priority
                sizes="(max-width: 1023px) 100vw, 942px"
                className="hero-doctor-image"
              />
            </div>

            <DoctorProfileCard
              name={heroDoctor.name}
              credentials={heroDoctor.credentials}
              experience={heroDoctor.experience}
              className={cn(
                "absolute bottom-5 right-4 z-30 w-[min(100%,17.5rem)] sm:bottom-7 sm:right-6 lg:bottom-8 lg:right-8"
              )}
            />
          </div>
        </div>
      </div>

      <FeatureStrip />
    </section>
  );
}
