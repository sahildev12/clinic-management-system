import { cn } from "@/lib/utils";

/** Compact toolbar / outline control — matches primary height. */
export function adminSecondaryButtonClassName(className?: string) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3.5 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#fafafa] disabled:pointer-events-none disabled:opacity-50",
    className
  );
}

/** Primary CTA — same height as toolbar controls. */
export function adminPrimaryButtonClassName(className?: string) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-teal)] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0fb5ad] disabled:pointer-events-none disabled:opacity-50",
    className
  );
}
