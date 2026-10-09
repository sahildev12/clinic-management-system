import { Star } from "lucide-react";

import { marketingTestimonials } from "@/config/marketing";

export function SiteTestimonials() {
  return (
    <section className="relative overflow-hidden bg-[var(--brand-navy)] py-16 text-white md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(75,163,227,0.35), transparent 40%), radial-gradient(circle at 85% 75%, rgba(0,194,178,0.2), transparent 45%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
            Testimonials
          </span>
          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
            Smiles our patients talk about
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
            Real feedback from people who booked cleanings, whitening, and restorative care with us.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {marketingTestimonials.map((person) => (
            <article
              key={person.id}
              className="rounded-[1.5rem] bg-white p-6 text-[var(--brand-charcoal)] shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
            >
              <div className="flex gap-0.5 text-[var(--brand-teal)]" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-[#4b5563]">
                “{person.quote}”
              </blockquote>
              <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={person.avatar}
                  alt=""
                  className="size-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-extrabold">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
