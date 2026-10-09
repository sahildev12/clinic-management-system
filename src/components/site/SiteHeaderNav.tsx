"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeaderNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Main navigation">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-4 py-2 text-[15px] font-semibold text-[#1a2f4d] transition-colors hover:text-[var(--hero-navy)]",
              active && "text-[var(--hero-navy)]"
            )}
          >
            {item.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--hero-accent)]"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
