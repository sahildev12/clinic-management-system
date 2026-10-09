"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteMobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-[#d8e7f3] bg-white text-[var(--hero-navy)]"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-black/5 bg-white px-4 py-4 shadow-lg">
          <nav className="flex flex-col gap-1" aria-label="Mobile menu">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--hero-navy)] hover:bg-[var(--hero-bg)]",
                    active && "bg-[var(--hero-bg)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/appointment"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[var(--hero-navy)] px-4 text-sm font-bold text-white"
            >
              Book Online
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
