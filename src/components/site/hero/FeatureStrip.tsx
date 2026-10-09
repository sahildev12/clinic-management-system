import { heroFeatures } from "@/config/hero";

export function FeatureStrip() {
  return (
    <div className="hero-feature-strip w-full shrink-0 bg-[var(--hero-navy)] text-white">
      <ul className="flex w-full flex-col gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:px-10 xl:px-14 2xl:px-20">
        {heroFeatures.map((feature) => (
          <li
            key={feature.title}
            className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-none lg:px-1"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--hero-accent)] ring-1 ring-white/10">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-white">{feature.title}</p>
              <p className="mt-0.5 text-xs leading-tight text-white/72 lg:whitespace-nowrap">
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
