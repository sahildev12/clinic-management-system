"use client";

import { Suspense } from "react";

import {
  AppointmentCalendarWorkspace,
} from "@/components/admin/appointments/AppointmentCalendarWorkspace";
import type { AppointmentRow } from "@/components/admin/appointments/AppointmentListView";

export type { AppointmentRow };

type ProviderOption = {
  id: string;
  name: string;
  category?: string | null;
  avatarUrl?: string | null;
  providerType?: string | null;
};

type PatientOption = { id: string; name: string; phone: string; patientReference?: string };

type Props = {
  appointments: AppointmentRow[];
  patients: PatientOption[];
  providers: ProviderOption[];
  total: number;
  page: number;
  pageSize: number;
  viewerRole: {
    role: string;
    providerId?: string | null;
    providerType?: string | null;
    isDoctor: boolean;
    isAdmin: boolean;
  };
  filters: {
    status: string;
    source: string;
    q: string;
    providerId: string;
    category: string;
    view: string;
    anchor: string;
  };
};

export function AppointmentsManager(props: Props) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <AppointmentCalendarWorkspace {...props} />
    </Suspense>
  );
}
