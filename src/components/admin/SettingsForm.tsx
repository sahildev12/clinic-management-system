"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import {
  DEFAULT_PATIENT_REFERENCE_TEMPLATE,
  previewPatientReference,
} from "@/lib/patient-reference";
import { cn } from "@/lib/utils";

type HeaderBrandMode = "ICON_AND_TEXT" | "FULL_IMAGE";

type Settings = {
  clinicName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  headerBrandMode?: HeaderBrandMode | null;
  patientReferenceTemplate?: string | null;
  lunchStartHour?: number | null;
  lunchEndHour?: number | null;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return {
    value: String(hour),
    label: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
});

export function SettingsForm({
  settings,
}: {
  settings: Settings;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [email, setEmail] = useState(settings.email ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [description, setDescription] = useState(settings.description ?? "");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl ?? "");
  const [headerBrandMode, setHeaderBrandMode] = useState<HeaderBrandMode>(
    settings.headerBrandMode === "FULL_IMAGE" ? "FULL_IMAGE" : "ICON_AND_TEXT"
  );
  const [template, setTemplate] = useState(
    settings.patientReferenceTemplate?.trim() || DEFAULT_PATIENT_REFERENCE_TEMPLATE
  );
  const [lunchStartHour, setLunchStartHour] = useState(String(settings.lunchStartHour ?? 13));
  const [lunchEndHour, setLunchEndHour] = useState(String(settings.lunchEndHour ?? 14));

  const preview = useMemo(() => previewPatientReference(template), [template]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (headerBrandMode === "FULL_IMAGE" && !logoUrl.trim()) {
      toast.error("Choose a logo image for full-image header branding");
      setTab("branding");
      return;
    }
    const start = Number(lunchStartHour);
    const end = Number(lunchEndHour);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      toast.error("Lunch end must be after lunch start");
      setTab("hours");
      return;
    }
    setSaving(true);
    const payload = {
      clinicName,
      phone,
      email,
      address,
      description,
      logoUrl,
      headerBrandMode,
      patientReferenceTemplate: template,
      lunchStartHour: start,
      lunchEndHour: end,
    };

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save settings");
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  const tabTriggerClass =
    "rounded-lg px-4 py-2 text-sm font-medium text-[#5c636a] shadow-none hover:text-[#1a1a1a] data-active:bg-white data-active:text-[#111827] data-active:shadow-[0_1px_2px_rgba(16,24,40,0.1)]";

  return (
    <div className="max-w-4xl space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="w-fit justify-start gap-0.5 rounded-xl border border-[#dde1e6] bg-[#e5e7eb] p-1">
          <TabsTrigger value="general" className={tabTriggerClass}>
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className={tabTriggerClass}>
            Branding
          </TabsTrigger>
          <TabsTrigger value="hours" className={tabTriggerClass}>
            Hours
          </TabsTrigger>
          <TabsTrigger value="patients" className={tabTriggerClass}>
            Patients
          </TabsTrigger>
        </TabsList>

        <form onSubmit={onSubmit} className="space-y-4">
          <TabsContent value="general" className="mt-0 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#1a1a1a]">General settings</h2>
              <p className="text-sm text-[#6b7177]">
                Basic clinic identity used across the public site and admin.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic name</Label>
                <Input
                  id="clinicName"
                  required={tab === "general"}
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 020-2555-0101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. hello@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Short clinic description shown in the website footer"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-20"
                />
                <p className="text-xs text-[#6b7177]">
                  Appears under the clinic name in the public site footer.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="mt-0 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#1a1a1a]">Header branding</h2>
              <p className="text-sm text-[#6b7177]">
                Choose how the clinic brand appears in the public site header.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-[#1a1a1a]">Brand display mode</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-colors",
                      headerBrandMode === "ICON_AND_TEXT"
                        ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_8%,white)]"
                        : "border-[#e3e3e3] hover:bg-[#fafafa]"
                    )}
                  >
                    <input
                      type="radio"
                      name="headerBrandMode"
                      className="sr-only"
                      checked={headerBrandMode === "ICON_AND_TEXT"}
                      onChange={() => setHeaderBrandMode("ICON_AND_TEXT")}
                    />
                    <p className="text-sm font-semibold text-[#1a1a1a]">Icon + text</p>
                    <p className="mt-1 text-xs text-[#6b7177]">
                      Small icon beside the clinic name (current look).
                    </p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-[#d4d4d8] bg-white px-3 py-2">
                      <span className="relative inline-flex size-8 items-center justify-center rounded-lg bg-[var(--brand-sky)]">
                        <span className="absolute h-4 w-1 rounded-full bg-white" />
                        <span className="absolute h-1 w-4 rounded-full bg-white" />
                      </span>
                      <span className="truncate text-sm font-bold text-[var(--brand-navy)]">
                        {clinicName || "Clinic name"}
                      </span>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-colors",
                      headerBrandMode === "FULL_IMAGE"
                        ? "border-[var(--brand-teal)] bg-[color-mix(in_oklab,var(--brand-teal)_8%,white)]"
                        : "border-[#e3e3e3] hover:bg-[#fafafa]"
                    )}
                  >
                    <input
                      type="radio"
                      name="headerBrandMode"
                      className="sr-only"
                      checked={headerBrandMode === "FULL_IMAGE"}
                      onChange={() => setHeaderBrandMode("FULL_IMAGE")}
                    />
                    <p className="text-sm font-semibold text-[#1a1a1a]">Full image</p>
                    <p className="mt-1 text-xs text-[#6b7177]">
                      Use a wide logo image instead of icon + clinic name.
                    </p>
                    <div className="mt-3 flex h-12 items-center justify-center rounded-lg border border-dashed border-[#d4d4d8] bg-white px-3">
                      {logoUrl.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl.trim()}
                          alt="Logo preview"
                          className="max-h-9 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#9ca3af]">Choose an image to preview</span>
                      )}
                    </div>
                  </label>
                </div>
              </fieldset>

              <MediaPicker
                value={logoUrl}
                onChange={setLogoUrl}
                acceptType="IMAGE"
                label={headerBrandMode === "FULL_IMAGE" ? "Logo image" : "Icon image (optional)"}
                required={headerBrandMode === "FULL_IMAGE"}
                helpText={
                  headerBrandMode === "FULL_IMAGE"
                    ? "Required. Upload or pick a transparent PNG/SVG-style logo from the media library."
                    : "Optional. Leave empty to use the default clinic icon mark."
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="hours" className="mt-0 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#1a1a1a]">Clinic hours</h2>
              <p className="text-sm text-[#6b7177]">
                Lunch break blocks public booking slots. Clinic days are Mon–Sat, 9 AM – 6 PM.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lunch starts</Label>
                <AppSelect
                  value={lunchStartHour}
                  onValueChange={setLunchStartHour}
                  options={HOUR_OPTIONS}
                />
              </div>
              <div className="space-y-2">
                <Label>Lunch ends</Label>
                <AppSelect
                  value={lunchEndHour}
                  onValueChange={setLunchEndHour}
                  options={HOUR_OPTIONS}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-[#6b7177]">
              Slots during this range are hidden on the public booking calendar.
            </p>
          </TabsContent>

          <TabsContent value="patients" className="mt-0 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#1a1a1a]">Patient settings</h2>
              <p className="text-sm text-[#6b7177]">
                Reference numbering for newly created patient records.
              </p>
            </div>

            <div className="mt-5 space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-4">
              <Label htmlFor="patientReferenceTemplate">Patient reference template</Label>
              <Input
                id="patientReferenceTemplate"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="bg-white"
                placeholder={DEFAULT_PATIENT_REFERENCE_TEMPLATE}
                required={tab === "patients"}
              />
              <p className="text-xs text-[#6b7177]">
                Use {"{YEAR}"} for the current year and {"{SEQ:n}"} for a zero-padded sequence (n =
                1–12). Example: <code>PAT-{"{YEAR}"}-{"{SEQ:6}"}</code>. Changing this only affects
                newly created patients.
              </p>
              <p className="text-sm text-[#1a1a1a]">
                Preview:{" "}
                <span className="font-semibold tabular-nums">{preview ?? "Invalid template"}</span>
              </p>
            </div>
          </TabsContent>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
