"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isValidIndiaMobile,
  sanitizeIndiaMobileDigits,
  toIndiaE164,
} from "@/lib/phone";

export function ContactForm() {
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!isValidIndiaMobile(phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      email,
      phone: toIndiaE164(phone),
      subject,
      message,
    };

    const res = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not send message");
      return;
    }
    toast.success("Message sent — we will get back to you shortly");
    form.reset();
    setPhone("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_20px_50px_rgba(27,58,107,0.1)]"
    >
      <div className="border-b border-black/5 bg-[linear-gradient(135deg,#f7fbfe_0%,white_55%)] px-5 py-5 md:px-7 md:py-6">
        <h2 className="font-heading text-xl font-extrabold text-[var(--brand-charcoal)] md:text-2xl">
          Send a message
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share a few details and we&apos;ll follow up from the clinic desk.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 md:px-7 md:py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Your full name" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <div className="flex h-8 overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="inline-flex shrink-0 items-center border-r border-input bg-[#f8fafc] px-2.5 text-sm font-semibold text-[var(--brand-navy)]">
                +91
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(sanitizeIndiaMobileDigits(e.target.value))}
                className="min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">
              Subject <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="subject" name="subject" placeholder="How can we help?" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            required
            rows={8}
            placeholder="Tell us about your question or visit…"
            className="min-h-44 resize-y"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="mt-1 h-11 w-full rounded-full bg-[var(--brand-teal)] text-base font-bold text-white hover:bg-[var(--brand-teal-dark)] sm:w-auto sm:min-w-44"
        >
          {saving ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
