"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteNewsletter() {
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email to subscribe");
      return;
    }
    toast.success("Thanks — we’ll keep you posted with dental tips.");
    setEmail("");
  }

  return (
    <section className="bg-[var(--brand-teal)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 md:flex-row md:items-center">
        <div className="max-w-xl text-white">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
            Stay ahead of your next cleaning
          </h2>
          <p className="mt-2 text-sm text-white/90 md:text-base">
            Get practical dental tips and clinic updates — no spam, just useful reminders.
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
        >
          <LabelledEmail value={email} onChange={setEmail} />
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-full bg-[var(--brand-navy)] px-6 font-bold text-white hover:bg-[var(--brand-charcoal)]"
          >
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}

function LabelledEmail({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <Input
        id="newsletter-email"
        type="email"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your email"
        className="h-11 rounded-full border-0 bg-white px-4 text-[var(--brand-charcoal)]"
      />
    </>
  );
}
