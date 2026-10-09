import { Star } from "lucide-react";

import { heroTrust } from "@/config/hero";

export function TrustIndicators() {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-1">
      <div className="flex items-center">
        {heroTrust.avatars.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${index}`}
            src={src}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full border-2 border-white object-cover shadow-sm"
            style={{ marginLeft: index === 0 ? 0 : "-10px", zIndex: heroTrust.avatars.length - index }}
          />
        ))}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--hero-navy)]">{heroTrust.rating}</span>
          <div className="flex items-center gap-0.5 text-[#f5b301]" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="size-4 fill-current" />
            ))}
          </div>
        </div>
        <p className="text-sm font-medium text-[#5c6f86]">{heroTrust.label}</p>
      </div>
    </div>
  );
}
