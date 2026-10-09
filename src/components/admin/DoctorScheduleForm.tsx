"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  APPOINTMENT_DURATION_OPTIONS,
  formatWorkDaysLabel,
  WEEKDAY_OPTIONS,
} from "@/lib/provider-schedule";
import { cn } from "@/lib/utils";

type ScheduleData = {
  appointmentDurationMinutes: number;
  workDays: number[];
  workStartHour: number;
  workEndHour: number;
  lunchStartHour: number;
  lunchEndHour: number;
  useClinicHours: boolean;
  providerName?: string;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return {
    value: String(hour),
    label: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
});

type Props = {
  providerId?: string;
  endpoint?: string;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function DoctorScheduleForm({
  providerId,
  endpoint,
  embedded,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const apiBase = endpoint ?? (providerId ? `/api/admin/providers/${providerId}/schedule` : "/api/admin/my-schedule");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [duration, setDuration] = useState("30");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [workStartHour, setWorkStartHour] = useState("9");
  const [workEndHour, setWorkEndHour] = useState("18");
  const [lunchStartHour, setLunchStartHour] = useState("13");
  const [lunchEndHour, setLunchEndHour] = useState("14");
  const [useClinicHours, setUseClinicHours] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(apiBase)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as ScheduleData & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not load schedule");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setDoctorName(data.providerName ?? "");
        setDuration(String(data.appointmentDurationMinutes));
        setWorkDays(data.workDays ?? []);
        setWorkStartHour(String(data.workStartHour));
        setWorkEndHour(String(data.workEndHour));
        setLunchStartHour(String(data.lunchStartHour));
        setLunchEndHour(String(data.lunchEndHour));
        setUseClinicHours(Boolean(data.useClinicHours));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Could not load schedule");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const workDaysPreview = useMemo(() => formatWorkDaysLabel(workDays), [workDays]);

  function toggleWorkDay(day: number) {
    setWorkDays((current) => {
      const next = current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (workDays.length === 0) {
      toast.error("Select at least one working day");
      return;
    }

    const payload = {
      appointmentDurationMinutes: Number(duration),
      workDays,
      workStartHour: Number(workStartHour),
      workEndHour: Number(workEndHour),
      lunchStartHour: Number(lunchStartHour),
      lunchEndHour: Number(lunchEndHour),
      useClinicHours,
    };

    setSaving(true);
    const res = await fetch(apiBase, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save schedule");
      return;
    }

    toast.success("Schedule saved");
    if (onSuccess) onSuccess();
    else router.refresh();
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading schedule…</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", embedded ? "" : "max-w-2xl")}>
      {doctorName ? (
        <p className="text-sm text-muted-foreground">
          Availability for <span className="font-medium text-[#111827]">Dr. {doctorName}</span>
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label>Appointment length</Label>
        <AppSelect
          value={duration}
          onValueChange={setDuration}
          options={APPOINTMENT_DURATION_OPTIONS}
        />
        <p className="text-[11px] text-muted-foreground">Each slot is 10–60 minutes.</p>
      </div>

      <div className="space-y-2">
        <Label>Working days</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = workDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWorkDay(day.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected
                    ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white"
                    : "border-[#e3e3e3] bg-white text-[#4b5563] hover:border-[var(--brand-sky)]"
                )}
              >
                {day.label.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">{workDaysPreview}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Day starts</Label>
          <AppSelect value={workStartHour} onValueChange={setWorkStartHour} options={HOUR_OPTIONS} />
        </div>
        <div className="space-y-1.5">
          <Label>Day ends</Label>
          <AppSelect value={workEndHour} onValueChange={setWorkEndHour} options={HOUR_OPTIONS} />
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3 text-sm">
        <input
          type="checkbox"
          checked={useClinicHours}
          onChange={(e) => setUseClinicHours(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-[#111827]">Use clinic lunch hours</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            When enabled, lunch break follows clinic settings. Turn off to set custom lunch hours below.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Lunch starts</Label>
          <AppSelect
            value={lunchStartHour}
            onValueChange={(value) => {
              setLunchStartHour(value);
              setUseClinicHours(false);
            }}
            options={HOUR_OPTIONS}
            disabled={useClinicHours}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lunch ends</Label>
          <AppSelect
            value={lunchEndHour}
            onValueChange={(value) => {
              setLunchEndHour(value);
              setUseClinicHours(false);
            }}
            options={HOUR_OPTIONS}
            disabled={useClinicHours}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}
