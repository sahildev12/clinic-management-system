import Link from "next/link";
import type { CSSProperties } from "react";
import { Phone } from "lucide-react";

import { SiteHeaderNav } from "@/components/site/SiteHeaderNav";
import { SiteMobileNav } from "@/components/site/SiteMobileNav";
import { buttonVariants } from "@/components/ui/button";
import { marketingServices, siteNav } from "@/config/marketing";
import { getClinicSettings } from "@/services/clinic.service";
import { cn } from "@/lib/utils";

function BrandMark({
  clinicName,
  logoUrl,
  mode,
}: {
  clinicName: string;
  logoUrl?: string | null;
  mode?: "ICON_AND_TEXT" | "FULL_IMAGE" | null;
}) {
  const logo = logoUrl?.trim();
  const useFullImage = mode === "FULL_IMAGE" && Boolean(logo);

  if (useFullImage && logo) {
    return (
      <span className="relative inline-flex h-10 max-w-[220px] items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={clinicName}
          className="h-10 w-auto max-w-[220px] object-contain object-left"
        />
      </span>
    );
  }

  return (
    <>
      {logo ? (
        <span className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-cream)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="size-full object-cover" />
        </span>
      ) : (
        <span
          aria-hidden
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--hero-accent)] shadow-[0_8px_20px_rgba(63,157,224,0.28)]"
        >
          <span className="absolute h-5 w-1.5 rounded-full bg-white" />
          <span className="absolute h-1.5 w-5 rounded-full bg-white" />
        </span>
      )}
      <span className="truncate font-heading text-[1.35rem] font-semibold tracking-tight text-[var(--hero-navy)]">
        {clinicName}
      </span>
    </>
  );
}

export async function SiteHeader() {
  const settings = await getClinicSettings();
  const phone = settings.phone?.trim();

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.04] bg-white">
      <div className="relative mx-auto flex h-[78px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <BrandMark
            clinicName={settings.clinicName}
            logoUrl={settings.logoUrl}
            mode={settings.headerBrandMode}
          />
        </Link>

        <SiteHeaderNav items={[...siteNav]} className="absolute left-1/2 hidden -translate-x-1/2 lg:flex" />

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="hidden items-center gap-2 text-sm font-semibold text-[var(--hero-navy)] transition-colors hover:text-[var(--hero-accent)] md:inline-flex"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#eef7fd] text-[var(--hero-accent)]">
                <Phone className="size-4" aria-hidden />
              </span>
              <span className="whitespace-nowrap">{phone}</span>
            </a>
          ) : null}
          <Link
            href="/appointment"
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden h-11 rounded-full bg-[var(--hero-navy)] px-6 text-sm font-bold text-white shadow-sm hover:bg-[#0f2f57] sm:inline-flex"
            )}
          >
            Book Online
          </Link>
          <SiteMobileNav items={[...siteNav]} />
        </div>
      </div>
    </header>
  );
}

function FooterSparkle({
  className,
  delay = "0s",
  duration = "3.6s",
}: {
  className?: string;
  delay?: string;
  duration?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`footer-sparkle ${className ?? ""}`}
      style={
        {
          "--sparkle-delay": delay,
          "--sparkle-duration": duration,
        } as CSSProperties
      }
    >
      <path d="M12 1.2c.35 3.9 2.9 6.45 6.8 6.8-3.9.35-6.45 2.9-6.8 6.8-.35-3.9-2.9-6.45-6.8-6.8 3.9-.35 6.45-2.9 6.8-6.8Z" />
    </svg>
  );
}

export async function SiteFooter() {
  const settings = await getClinicSettings();
  const phone = settings.phone?.trim();
  const email = settings.email?.trim();

  return (
    <footer className="relative mt-auto overflow-hidden bg-[var(--brand-navy)] text-white/80">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <FooterSparkle
          className="absolute left-[5%] top-10 size-9 text-[var(--brand-sky)]/70"
          delay="0s"
          duration="3.2s"
        />
        <FooterSparkle
          className="absolute left-[22%] top-[38%] size-7 text-[var(--brand-sky)]/55"
          delay="0.7s"
          duration="4s"
        />
        <FooterSparkle
          className="absolute right-[40%] top-8 size-8 text-[var(--brand-sky)]/60"
          delay="1.2s"
          duration="3.5s"
        />
        <FooterSparkle
          className="absolute bottom-28 left-[10%] size-12 text-[var(--brand-sky)]/45"
          delay="0.4s"
          duration="4.4s"
        />
        <FooterSparkle
          className="absolute bottom-20 right-[6%] size-14 text-[var(--brand-sky)]/40"
          delay="1.8s"
          duration="5s"
        />
        <FooterSparkle
          className="absolute right-[16%] top-[46%] size-6 text-[var(--brand-sky)]/65"
          delay="2.2s"
          duration="3s"
        />
        <FooterSparkle
          className="absolute bottom-32 right-[30%] size-10 text-[var(--brand-sky)]/50"
          delay="1s"
          duration="3.8s"
        />
        <FooterSparkle
          className="absolute left-[48%] bottom-24 size-8 text-[var(--brand-sky)]/55"
          delay="2.6s"
          duration="4.2s"
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-heading text-xl font-extrabold text-white">{settings.clinicName}</p>
          <p className="mt-3 text-sm leading-relaxed">
            {settings.description?.trim() ||
              "Gentle, modern dental care with easy online booking, clear treatment plans, and follow-up reminders your whole family can trust."}
          </p>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Quick links</p>
          <ul className="mt-4 space-y-2 text-sm">
            {siteNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Our services</p>
          <ul className="mt-4 space-y-2 text-sm">
            {marketingServices.map((service) => (
              <li key={service}>
                <Link href="/services" className="transition-colors hover:text-white">
                  {service}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Contact us</p>
          <ul className="mt-4 space-y-2 text-sm">
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-white">
                  {phone}
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a href={`mailto:${email}`} className="hover:text-white">
                  {email}
                </a>
              </li>
            ) : null}
            {settings.address ? <li className="leading-relaxed">{settings.address}</li> : null}
            <li>Mon–Sat · 9:00 AM – 7:00 PM</li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/55">
          © {new Date().getFullYear()} {settings.clinicName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
