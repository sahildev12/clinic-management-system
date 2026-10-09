import Link from "next/link";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { cn } from "@/lib/utils";

const AUTH_CARD_WIDTH = "max-w-[32rem]";
const AUTH_CARD_WIDTH_WIDE = "max-w-[36rem]";

function AuthBrandIcon() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        aria-hidden
        className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-sky)]"
      >
        <span className="absolute h-3.5 w-1 rounded-full bg-white" />
        <span className="absolute h-1 w-3.5 rounded-full bg-white" />
      </span>
      <span className="font-heading text-sm font-extrabold tracking-tight text-[var(--brand-navy)]">
        CarePlus
      </span>
    </Link>
  );
}

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Visible role badge: Admin or Team */
  roleTag: "Admin" | "Team" | "Doctor";
};

export function AuthPageShell({ title, subtitle, children, wide = false, roleTag }: Props) {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-[#eef4fa] py-6 md:py-10">
      <AuthBackground />
      <div className="relative z-10 mx-auto w-full px-4 md:px-6">
        <div
          className={cn(
            "login-fade-in mx-auto overflow-hidden rounded-2xl border border-border/70 bg-white/95 shadow-[0_24px_70px_rgba(27,58,107,0.12)] backdrop-blur-sm",
            wide ? AUTH_CARD_WIDTH_WIDE : AUTH_CARD_WIDTH
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <AuthBrandIcon />
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                roleTag === "Admin"
                  ? "bg-[var(--brand-navy)]/10 text-[var(--brand-navy)]"
                  : "bg-[var(--brand-sky)]/15 text-[var(--brand-sky)]"
              )}
            >
              {roleTag}
            </span>
          </div>

          <div className="px-5 py-6 md:px-6 md:py-7">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--brand-charcoal)] md:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
