import Link from "next/link";
import { CalendarDays, Clock3, Mail, MapPin, Phone } from "lucide-react";

import { ContactForm } from "@/components/site/ContactForm";
import { formatLunchBreakLabel } from "@/lib/booking-slots";

type Props = {
  clinicName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  lunchStartHour: number;
  lunchEndHour: number;
};

export function SiteContact({
  clinicName,
  phone,
  email,
  address,
  lunchStartHour,
  lunchEndHour,
}: Props) {
  const lunchLabel = formatLunchBreakLabel(lunchStartHour, lunchEndHour);
  const telHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;
  const mailHref = email ? `mailto:${email}` : null;
  const mapQuery = encodeURIComponent(address?.trim() || `${clinicName}, Baner, Pune`);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`;

  return (
    <section className="relative overflow-hidden bg-[#eef6fc]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand-sky)_12%,transparent),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-12 md:py-16">
        <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="contact-fade-in space-y-5">
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
                We&apos;re here when you need us
              </h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                Questions about treatments, bookings, or follow-ups? Send a message and our desk will
                reply shortly.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <iframe
                title={`${clinicName} location map`}
                src={mapSrc}
                className="aspect-[16/9] w-full border-0 bg-[#dce8f4]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="rounded-2xl bg-white px-5 py-5 ring-1 ring-black/5">
              <h2 className="font-heading text-lg font-extrabold text-[var(--brand-charcoal)]">
                Contact Information
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {phone ? (
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[var(--brand-charcoal)]">
                      <Phone className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--brand-charcoal)]">Phone</p>
                      <a
                        href={telHref!}
                        className="mt-0.5 block text-sm text-muted-foreground hover:text-[var(--brand-charcoal)] hover:underline"
                      >
                        {phone}
                      </a>
                    </div>
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[var(--brand-charcoal)]">
                      <Mail className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--brand-charcoal)]">Email</p>
                      <a
                        href={mailHref!}
                        className="mt-0.5 block break-all text-sm text-muted-foreground hover:text-[var(--brand-charcoal)] hover:underline"
                      >
                        {email}
                      </a>
                    </div>
                  </div>
                ) : null}

                {address ? (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[var(--brand-charcoal)]">
                      <MapPin className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--brand-charcoal)]">Address</p>
                      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{address}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[var(--brand-navy)] px-5 py-5 text-white">
              <div
                aria-hidden
                className="absolute -left-3 top-1/2 size-24 -translate-y-1/2 rounded-full bg-[var(--brand-sky)]/35"
              />
              <div
                aria-hidden
                className="absolute -right-6 -top-8 size-28 rounded-full bg-[var(--brand-sky)]/25"
              />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-sky)]/35 ring-1 ring-white/20">
                    <Clock3 className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                      Clinic hours
                    </p>
                    <p className="mt-0.5 font-heading text-lg font-extrabold">
                      Mon–Sat · 9 AM – 6 PM
                    </p>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  Sundays closed · Lunch {lunchLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="contact-fade-in-delay min-w-0 lg:sticky lg:top-24">
            <ContactForm />
          </div>
        </div>

        <div className="contact-fade-in-delay flex flex-col gap-4 rounded-2xl bg-white px-5 py-5 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand-sky)_16%,white)] text-[var(--brand-sky)]">
              <CalendarDays className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-[var(--brand-charcoal)]">
                Prefer to book your appointment online?
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                It&apos;s quick, easy, and you can choose a time that works best for you.
              </p>
            </div>
          </div>
          <Link
            href="/appointment"
            className="brand-book-btn shrink-0 self-start sm:self-center"
          >
            Book Online Now →
          </Link>
        </div>
      </div>
    </section>
  );
}
