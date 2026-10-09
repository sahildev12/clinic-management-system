import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Smile,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  clinicName: string;
  address?: string | null;
  hoursLabel: string;
};

const stats = [
  { value: "12+", label: "Years of dental experience", icon: Smile, tone: "sky" as const },
  { value: "8K+", label: "Happy patients", icon: Users, tone: "teal" as const },
];

const reasons = [
  {
    icon: MessageSquare,
    title: "Clear Communication",
    text: "We explain every step so you feel comfortable and informed.",
  },
  {
    icon: CalendarCheck,
    title: "Easy Appointments",
    text: "Book online in minutes and get timely reminders.",
  },
  {
    icon: ShieldCheck,
    title: "Modern Treatments",
    text: "Advanced technology for safe, effective, and lasting results.",
  },
  {
    icon: FileText,
    title: "Hassle-free Experience",
    text: "Digital records, tracked payments, and printable prescriptions.",
  },
];

const promises = [
  "Experienced & friendly dental team",
  "Patient-first approach",
  "Advanced equipment",
  "Clean, comfortable environment",
];

export function SiteAbout({ clinicName, address, hoursLabel }: Props) {
  return (
    <>
      <section className="relative overflow-hidden bg-[#eef6fc]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--brand-sky)_14%,transparent),transparent_60%)]"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-sky)]">
              About {clinicName}
            </p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight tracking-tight text-[var(--brand-navy)] md:text-4xl lg:text-[2.9rem] lg:leading-[1.1]">
              Compassionate Care.
              <br />
              Healthy Smiles.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              At {clinicName}, we provide gentle, modern dental care with clear communication and
              dependable follow-ups. Book online, visit our dental team, and leave with printable
              prescriptions and tracked payments — without paperwork hassle.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-[var(--brand-charcoal)]">
              {address ? (
                <li className="flex items-center gap-2.5">
                  <MapPin className="size-4 shrink-0 text-[var(--brand-sky)]" aria-hidden />
                  {address}
                </li>
              ) : null}
              <li className="flex items-center gap-2.5">
                <Clock3 className="size-4 shrink-0 text-[var(--brand-sky)]" aria-hidden />
                {hoursLabel}
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_50px_rgba(27,58,107,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80"
              alt={`${clinicName} treatment room`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f5faff] py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.62fr_1fr_1fr] lg:gap-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-2xl px-5 py-6 text-white",
                    stat.tone === "sky" ? "bg-[var(--brand-sky)]" : "bg-[var(--brand-teal)]"
                  )}
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/20">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-4 font-heading text-3xl font-extrabold">{stat.value}</p>
                  <p className="mt-1 text-sm leading-snug text-white/90">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="lg:border-r lg:border-black/5 lg:pr-8">
            <h2 className="font-heading text-xl font-extrabold text-[var(--brand-navy)] md:text-2xl">
              Why patients choose us
            </h2>
            <ul className="mt-5 space-y-4">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <li key={reason.title} className="flex gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-sky)] ring-1 ring-black/5">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--brand-charcoal)]">
                        {reason.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {reason.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-xl font-extrabold text-[var(--brand-navy)] md:text-2xl">
              Care that feels personal
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Our dental team combines clinical expertise with a gentle approach. From routine
              cleanings to specialized treatments, we tailor care to your needs and comfort.
            </p>
            <ul className="mt-5 space-y-3">
              {promises.map((promise) => (
                <li
                  key={promise}
                  className="flex items-center gap-2.5 text-sm text-[var(--brand-charcoal)]"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--brand-teal)]" aria-hidden />
                  {promise}
                </li>
              ))}
            </ul>
            <Link href="/appointment" className="brand-book-btn mt-7">
              Book Online Now →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-2xl bg-[var(--brand-navy)] px-6 py-7 text-white md:px-8">
            <div
              aria-hidden
              className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--brand-sky)]/20"
            />
            <div
              aria-hidden
              className="absolute -bottom-6 -left-6 size-28 rounded-full bg-[var(--brand-sky)]/15"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-sky)]/30 ring-1 ring-white/20">
                  <CalendarCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-heading text-lg font-extrabold md:text-xl">
                    Ready for a healthier smile?
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Book your appointment online in just a few clicks.
                  </p>
                </div>
              </div>
              <Link
                href="/appointment"
                className="brand-book-btn shrink-0 ring-1 ring-white/25"
              >
                Book Online Now →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
