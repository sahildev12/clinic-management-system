import { Clock3, HeartHandshake, Smile, Stethoscope, Users } from "lucide-react";

import { marketingStats } from "@/config/marketing";

const icons = {
  years: Clock3,
  patients: Smile,
  doctors: Stethoscope,
  satisfaction: HeartHandshake,
  support: Users,
} as const;

export function SiteStatsBar() {
  return (
    <section className="border-y border-black/5 bg-white">
      <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4 lg:py-10">
        {marketingStats.map((stat) => {
          const Icon = icons[stat.icon];
          return (
            <li key={stat.label} className="flex items-center gap-3 lg:flex-col lg:text-center">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-sky)]/10 text-[var(--brand-sky)]">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-[var(--brand-navy)]">{stat.value}</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
