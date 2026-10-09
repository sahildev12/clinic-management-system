import { BellRing, CalendarCheck, CreditCard, FolderOpen } from "lucide-react";

import { marketingFeatures } from "@/config/marketing";

const icons = [CalendarCheck, FolderOpen, CreditCard, BellRing] as const;

export function SiteClinicNumbers() {
  return (
    <section className="bg-[var(--brand-cream)] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
            Our clinic in numbers
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Everything designed to make dental care simpler before, during, and after your visit.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {marketingFeatures.map((feature, index) => {
            const Icon = icons[index] ?? CalendarCheck;
            return (
              <li
                key={feature.title}
                className="rounded-[1.5rem] bg-white p-6 shadow-[0_10px_30px_rgba(27,58,107,0.06)]"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-teal)]/10 text-[var(--brand-teal)]">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-[var(--brand-charcoal)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
