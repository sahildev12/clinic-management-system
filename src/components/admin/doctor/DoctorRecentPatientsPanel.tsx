"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  AdminDataTable,
  AdminPersonCell,
  AdminTableBody,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { Input } from "@/components/ui/input";
import { appointmentSourceLabel, formatDate } from "@/lib/admin-format";

export type DoctorRecentPatientRow = {
  patientId: string;
  name: string;
  patientReference: string | null;
  visitDate: string | Date;
  source: string;
  status: string;
};

type Props = {
  patients: DoctorRecentPatientRow[];
};

function matchesSearch(row: DoctorRecentPatientRow, query: string) {
  const haystack = [
    row.name,
    row.patientReference ? `#${row.patientReference}` : "",
    appointmentSourceLabel(row.source),
    row.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function DoctorRecentPatientsPanel({ patients }: Props) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return patients;
    return patients.filter((row) => matchesSearch(row, normalizedQuery));
  }, [patients, normalizedQuery]);

  return (
    <div>
      <div className="border-b border-[#ebebeb] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b7177]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients…"
            className="h-9 rounded-lg border-[#e3e3e3] pl-9 focus-visible:border-[var(--brand-teal)] focus-visible:ring-[var(--brand-teal)]/20"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[#6b7177]">
          {normalizedQuery ? "No patients match your search." : "No recent patients to display."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <AdminDataTable className="min-w-full">
            <AdminTableHeader>
              <AdminTh className="px-4">Patient</AdminTh>
              <AdminTh className="px-4">Visit date</AdminTh>
              <AdminTh className="px-4">Source</AdminTh>
              <AdminTh className="px-4">Status</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {filtered.map((row) => (
                <AdminTr key={row.patientId}>
                  <AdminTd className="px-4">
                    <Link
                      href={`/admin/patients/${row.patientId}`}
                      className="block hover:opacity-80"
                    >
                      <AdminPersonCell
                        name={row.name}
                        subtitle={row.patientReference ? `#${row.patientReference}` : undefined}
                      />
                    </Link>
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap px-4 text-[#4b5563]">
                    {formatDate(row.visitDate)}
                  </AdminTd>
                  <AdminTd className="px-4 text-[#4b5563]">
                    {appointmentSourceLabel(row.source)}
                  </AdminTd>
                  <AdminTd className="px-4">
                    <AdminStatusPill status={row.status} />
                  </AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminDataTable>
        </div>
      )}
    </div>
  );
}
