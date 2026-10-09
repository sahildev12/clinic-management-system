"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";

export type DoctorNotesReminderItem = {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "reminder" | "note" | "appointment";
};

type Props = {
  items: DoctorNotesReminderItem[];
};

export function DoctorNotesRemindersPanel({ items }: Props) {
  const [patientId, setPatientId] = useState("");

  const patientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.patientId)) {
        seen.set(item.patientId, item.patientName);
      }
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo(() => {
    if (!patientId) return items;
    return items.filter((item) => item.patientId === patientId);
  }, [items, patientId]);

  return (
    <div>
      <div className="border-b border-[#ebebeb] px-4 py-3">
        <AppSelect
          value={patientId}
          onValueChange={setPatientId}
          allowEmpty
          emptyLabel="All patients"
          placeholder="Filter by patient"
          options={patientOptions}
          triggerClassName="h-9 min-h-9 rounded-lg border-[#e3e3e3] bg-white focus-visible:border-[var(--brand-teal)] focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]/20"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[#6b7177]">
          {patientId ? "No notes or reminders for this patient." : "No notes or reminders yet."}
        </p>
      ) : (
        <ul className="divide-y divide-[#f0f0f0]">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block px-4 py-3 transition hover:bg-[#fafafa]"
              >
                <p className="text-sm font-medium text-[#111827]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[#6b7177]">{item.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
