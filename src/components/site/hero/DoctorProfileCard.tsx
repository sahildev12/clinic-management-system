import { ToothIcon } from "@/components/site/hero/ToothIcon";

type Props = {
  name: string;
  credentials: string;
  experience: string;
  className?: string;
};

export function DoctorProfileCard({ name, credentials, experience, className }: Props) {
  return (
    <div
      className={`rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(18,58,104,0.16)] backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f4fc] text-[var(--hero-accent)]">
          <ToothIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-[var(--hero-navy)]">{name}</p>
          <p className="mt-0.5 text-sm font-medium text-[#4a6078]">{credentials}</p>
          <p className="mt-1 text-xs font-semibold text-[#6b7f94]">{experience}</p>
        </div>
      </div>
    </div>
  );
}
