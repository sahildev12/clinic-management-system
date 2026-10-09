"use client";

import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { patientDisplayLabel } from "@/lib/patient-reference";
import { cn } from "@/lib/utils";

export type PatientSearchOption = {
  id: string;
  name: string;
  phone: string;
  patientReference?: string;
};

type Props = {
  patients: PatientSearchOption[];
  value: string;
  onValueChange: (patientId: string) => void;
  onAddNewPatient?: () => void;
  placeholder?: string;
  disabled?: boolean;
};

function matchesPatient(patient: PatientSearchOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const name = patient.name.toLowerCase();
  const reference = (patient.patientReference ?? "").toLowerCase();
  const phone = patient.phone.replace(/\D/g, "");
  if (name.includes(q)) return true;
  if (reference.includes(q)) return true;
  if (digits && phone.includes(digits)) return true;
  return false;
}

export function PatientSearchSelect({
  patients,
  value,
  onValueChange,
  onAddNewPatient,
  placeholder = "Search patient…",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = patients.find((patient) => patient.id === value);
  const filtered = useMemo(
    () => patients.filter((patient) => matchesPatient(patient, query)),
    [patients, query]
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-white px-2.5 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selected ? patientDisplayLabel(selected) : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--anchor-width)] min-w-[min(100%,22rem)] gap-0 p-0 sm:w-[28rem]"
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, or reference"
              className="h-8 bg-white pl-8"
              autoFocus
            />
          </div>
        </div>

        <ul className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              No patient found
              {query.trim() ? ` for “${query.trim()}”` : ""}.
            </li>
          ) : (
            filtered.map((patient) => {
              const selectedRow = patient.id === value;
              return (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onValueChange(patient.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                      selectedRow && "bg-[color-mix(in_oklab,var(--brand-teal)_18%,white)]"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{patientDisplayLabel(patient)}</span>
                    {selectedRow ? (
                      <Check className="size-4 shrink-0 text-[var(--brand-teal)]" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {onAddNewPatient ? (
          <div className="border-t border-border p-1.5">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-full justify-start gap-2 text-[var(--brand-navy)]"
              onClick={() => {
                setOpen(false);
                setQuery("");
                onAddNewPatient();
              }}
            >
              <Plus className="size-4" aria-hidden />
              New patient
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
