import Link from "next/link";

import { SiteTreatments } from "@/components/site/SiteTreatments";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Treatments" };

export default function ServicesPage() {
  return (
    <>
      <section className="bg-[#eef6fc] px-4 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[var(--brand-charcoal)]">
            Dental treatments & services
          </h1>
          <p className="mt-3 text-muted-foreground">
            Full list of cleanings, whitening, restorative care, orthodontics, and family dentistry
            — with clear booking and follow-up.
          </p>
          <Link
            href="/appointment"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 rounded-full bg-[var(--brand-teal)] font-bold text-white hover:bg-[var(--brand-teal-dark)]"
            )}
          >
            Book Online
          </Link>
        </div>
      </section>
      <SiteTreatments variant="all" />
    </>
  );
}
