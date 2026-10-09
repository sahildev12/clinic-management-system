import Link from "next/link";

import { featuredTreatments, marketingTreatments } from "@/config/marketing";

type Props = {
  /** Homepage shows featured treatments with a link; services page shows the full catalog. */
  variant?: "featured" | "all";
};

export function SiteTreatments({ variant = "featured" }: Props) {
  const isAll = variant === "all";
  const items = isAll ? marketingTreatments : featuredTreatments;

  return (
    <section className="bg-[var(--brand-cream)] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        {!isAll ? (
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-charcoal)]">
              <span className="size-2 rounded-full bg-[var(--brand-green)]" />
              Best Seller
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-[var(--brand-charcoal)] md:text-4xl">
              Our best-selling dental treatments
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Popular care options patients book most — from routine cleanings to smile-focused
              treatments.
            </p>
          </div>
        ) : null}

        <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${isAll ? "mt-0" : "mt-10"}`}>
          {items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-[1.75rem] bg-[var(--brand-sky)] shadow-[0_12px_40px_rgba(75,163,227,0.25)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="space-y-3 p-5 text-white md:p-6">
                <span className="inline-flex rounded-full bg-[var(--brand-green)] px-3 py-1 text-xs font-bold">
                  {item.badge}
                </span>
                <h3 className="text-2xl font-extrabold leading-tight">{item.title}</h3>
                <p className="text-sm text-white/90">{item.description}</p>
              </div>
              <div className="px-3 pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                />
              </div>
            </article>
          ))}
        </div>

        {!isAll ? (
          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="text-sm font-bold text-[var(--brand-navy)] underline-offset-4 hover:underline"
            >
              View all treatments
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
