"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PatientClinicalActions } from "@/components/admin/PatientClinicalActions";
import {
  AdminDataTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { AdminRowActions } from "@/components/admin/table/AdminRowActions";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  bookedByLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  paymentPreferenceLabel,
} from "@/lib/admin-format";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

type MedicineLine = {
  id: string;
  dosage: string;
  duration?: string | null;
  instructions?: string | null;
  quantity?: number | null;
  medicine: { name: string; strength?: string | null };
};

type AppointmentRow = {
  id: string;
  dateTime: Date | string;
  status: string;
  source: string;
  notes?: string | null;
  bookingReference?: string | null;
  durationMinutes?: number;
  paymentPreference?: string | null;
  prescriptions?: {
    id: string;
    diagnosis?: string | null;
    notes?: string | null;
    createdAt: Date | string;
    items: MedicineLine[];
  }[];
  encounters?: {
    id: string;
    visitedAt: Date | string;
    chiefComplaint?: string | null;
    notes?: string | null;
    vitalsJson?: unknown;
    provider?: { name: string } | null;
  }[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    paidAt: Date | string;
    receiptNumber?: string | null;
    notes?: string | null;
  }[];
};

type Props = {
  patient: {
    id: string;
    patientReference: string;
    name: string;
    phone: string;
    email?: string | null;
    gender?: string | null;
    dateOfBirth?: Date | string | null;
    address?: string | null;
    notes?: string | null;
    archivedAt?: Date | string | null;
    createdAt: Date | string;
    appointments: AppointmentRow[];
    appointmentCount: number;
    prescriptions: {
      id: string;
      diagnosis?: string | null;
      notes?: string | null;
      createdAt: Date | string;
      appointment?: { id: string; dateTime: Date | string } | null;
      items: MedicineLine[];
    }[];
    prescriptionCount: number;
    payments: {
      id: string;
      amount: { toString(): string } | number | string;
      method: string;
      paidAt: Date | string;
      notes?: string | null;
      voidedAt?: Date | string | null;
      receiptNumber?: string | null;
    }[];
    paymentCount: number;
    paymentTotal: number;
    reminders: {
      id: string;
      dueAt: Date | string;
      message: string;
      status: string;
    }[];
    reminderCount: number;
    allergies: {
      id: string;
      name: string;
      severity?: string | null;
      notes?: string | null;
    }[];
    allergyCount: number;
    conditions: {
      id: string;
      name: string;
      status: string;
      notes?: string | null;
    }[];
    conditionCount: number;
    encounters: {
      id: string;
      visitedAt: Date | string;
      chiefComplaint?: string | null;
      notes?: string | null;
      vitalsJson?: unknown;
      provider?: { name: string } | null;
    }[];
    encounterCount: number;
  };
};

function TabEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-white px-5 py-8 text-center text-sm text-[#6b7177]">
      {message}
    </div>
  );
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#6b7177]">
        {count}
      </span>
    </span>
  );
}

function formatVitals(vitals: unknown): string {
  if (!vitals || typeof vitals !== "object") return "—";
  const entries = Object.entries(vitals as Record<string, unknown>)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
  return entries.length ? entries.join(" · ") : "—";
}

export function PatientTracking({ patient }: Props) {
  const [viewingAppt, setViewingAppt] = useState<AppointmentRow | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <div>
        <Link
          href="/admin/patients"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#6b7177] transition-colors hover:text-[#1a1a1a]"
        >
          <ArrowLeft className="size-4" />
          Back to patients
        </Link>

        <AdminPageHeader
          className="mb-0"
          title={patient.name}
          description={`${patient.patientReference} · Patient tracking${
            patient.archivedAt ? " (Archived)" : ""
          }`}
          action={
            <Link
              href={`/admin/patients/${patient.id}/edit`}
              className={adminPrimaryButtonClassName()}
            >
              Edit patient
            </Link>
          }
        />
      </div>

      <AdminTableCard className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Reference</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#1a1a1a]">
              {patient.patientReference}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Phone</p>
            <a
              href={`tel:${patient.phone.replace(/\s+/g, "")}`}
              className="mt-0.5 inline-block text-sm font-medium text-[var(--brand-teal)] hover:underline"
            >
              {patient.phone}
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Email</p>
            {patient.email ? (
              <a
                href={`mailto:${patient.email}`}
                className="mt-0.5 inline-block text-sm font-medium text-[var(--brand-teal)] hover:underline"
              >
                {patient.email}
              </a>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-[#1a1a1a]">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Gender</p>
            <p className="mt-0.5 text-sm font-medium text-[#1a1a1a]">{patient.gender ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
              Date of birth
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#1a1a1a]">
              {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Address</p>
            <p className="mt-0.5 text-sm text-[#4b5563]">{patient.address?.trim() || "—"}</p>
          </div>
          {patient.notes?.trim() ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Notes</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#4b5563]">{patient.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-3 border-t border-[#ebebeb] pt-3">
          <PatientClinicalActions patientId={patient.id} />
        </div>
      </AdminTableCard>

      <Tabs defaultValue="appointments" className="gap-3">
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-[#e3e3e3] bg-transparent p-0"
        >
          {(
            [
              ["appointments", "Appointments", patient.appointmentCount],
              ["allergies", "Allergies", patient.allergyCount],
              ["conditions", "Conditions", patient.conditionCount],
              ["encounters", "Encounters", patient.encounterCount],
              ["prescriptions", "Prescriptions", patient.prescriptionCount],
              ["payments", "Payments", patient.paymentCount],
              ["reminders", "Reminders", patient.reminderCount],
            ] as const
          ).map(([value, label, count]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2 shadow-none data-active:border-b-[var(--brand-navy)] data-active:bg-transparent data-active:text-[var(--brand-navy)] data-active:shadow-none"
            >
              <TabLabel label={label} count={count} />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="appointments" className="mt-0">
          {patient.appointmentCount === 0 ? (
            <TabEmpty message="No appointments for this patient yet." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Date & time</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Source</AdminTh>
                  <AdminTh>Notes</AdminTh>
                  <AdminTh className="w-16 text-right">Actions</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.appointments.map((appt) => (
                    <AdminTr key={appt.id}>
                      <AdminTd className="font-medium text-[#1a1a1a]">
                        {formatDateTime(appt.dateTime)}
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusPill status={appt.status} />
                      </AdminTd>
                      <AdminTd className="text-[#4b5563]">{bookedByLabel(appt.source)}</AdminTd>
                      <AdminTd className="max-w-xs truncate text-[#4b5563]">
                        {appt.notes?.trim() || "—"}
                      </AdminTd>
                      <AdminTd>
                        <AdminRowActions onView={() => setViewingAppt(appt)} />
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>

        <TabsContent value="allergies" className="mt-0">
          {patient.allergyCount === 0 ? (
            <TabEmpty message="No known allergies recorded." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Allergy</AdminTh>
                  <AdminTh>Severity</AdminTh>
                  <AdminTh>Notes</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.allergies.map((allergy) => (
                    <AdminTr key={allergy.id}>
                      <AdminTd className="font-medium text-[#1a1a1a]">{allergy.name}</AdminTd>
                      <AdminTd className="text-[#4b5563]">{allergy.severity ?? "—"}</AdminTd>
                      <AdminTd className="max-w-xs truncate text-[#4b5563]">
                        {allergy.notes?.trim() || "—"}
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>

        <TabsContent value="conditions" className="mt-0">
          {patient.conditionCount === 0 ? (
            <TabEmpty message="No conditions recorded." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Condition</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Notes</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.conditions.map((condition) => (
                    <AdminTr key={condition.id}>
                      <AdminTd className="font-medium text-[#1a1a1a]">{condition.name}</AdminTd>
                      <AdminTd>
                        <AdminStatusPill status={condition.status} />
                      </AdminTd>
                      <AdminTd className="max-w-xs truncate text-[#4b5563]">
                        {condition.notes?.trim() || "—"}
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>

        <TabsContent value="encounters" className="mt-0">
          {patient.encounterCount === 0 ? (
            <TabEmpty message="No encounters recorded yet." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Visited</AdminTh>
                  <AdminTh>Complaint</AdminTh>
                  <AdminTh>Vitals</AdminTh>
                  <AdminTh>Provider</AdminTh>
                  <AdminTh>Notes</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.encounters.map((encounter) => (
                    <AdminTr key={encounter.id}>
                      <AdminTd className="whitespace-nowrap font-medium text-[#1a1a1a]">
                        {formatDateTime(encounter.visitedAt)}
                      </AdminTd>
                      <AdminTd className="text-[#4b5563]">
                        {encounter.chiefComplaint?.trim() || "—"}
                      </AdminTd>
                      <AdminTd className="max-w-xs text-[#4b5563]">
                        {formatVitals(encounter.vitalsJson)}
                      </AdminTd>
                      <AdminTd className="text-[#4b5563]">
                        {encounter.provider?.name ?? "—"}
                      </AdminTd>
                      <AdminTd className="max-w-xs truncate text-[#4b5563]">
                        {encounter.notes?.trim() || "—"}
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-0">
          {patient.prescriptionCount === 0 ? (
            <TabEmpty message="No prescriptions or suggested medicines yet." />
          ) : (
            <div className="flex flex-col gap-4">
              {patient.prescriptions.map((rx) => (
                <AdminTableCard key={rx.id} className="p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {rx.diagnosis?.trim() || "Prescription"}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7177]">
                        {formatDate(rx.createdAt)}
                        {rx.appointment
                          ? ` · Linked appointment ${formatDateTime(rx.appointment.dateTime)}`
                          : null}
                      </p>
                    </div>
                    <Link
                      href={`/admin/prescriptions/${rx.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--brand-teal)] hover:underline"
                    >
                      Print
                    </Link>
                  </div>

                  {rx.items.length === 0 ? (
                    <p className="text-sm text-[#6b7177]">No medicine lines on this prescription.</p>
                  ) : (
                    <AdminDataTable className="min-w-0">
                      <AdminTableHeader>
                        <AdminTh>Medicine</AdminTh>
                        <AdminTh>Dosage</AdminTh>
                        <AdminTh>Duration</AdminTh>
                        <AdminTh>Instructions</AdminTh>
                      </AdminTableHeader>
                      <AdminTableBody>
                        {rx.items.map((item) => (
                          <AdminTr key={item.id}>
                            <AdminTd className="font-medium text-[#1a1a1a]">
                              {item.medicine.name}
                              {item.medicine.strength ? (
                                <span className="ml-1 font-normal text-[#6b7177]">
                                  ({item.medicine.strength})
                                </span>
                              ) : null}
                            </AdminTd>
                            <AdminTd className="text-[#4b5563]">{item.dosage}</AdminTd>
                            <AdminTd className="text-[#4b5563]">{item.duration ?? "—"}</AdminTd>
                            <AdminTd className="text-[#4b5563]">{item.instructions ?? "—"}</AdminTd>
                          </AdminTr>
                        ))}
                      </AdminTableBody>
                    </AdminDataTable>
                  )}

                  {rx.notes?.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-[#4b5563]">{rx.notes}</p>
                  ) : null}
                </AdminTableCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          {patient.paymentCount === 0 ? (
            <TabEmpty message="No payments recorded for this patient." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Receipt</AdminTh>
                  <AdminTh>Amount</AdminTh>
                  <AdminTh>Method</AdminTh>
                  <AdminTh>Paid at</AdminTh>
                  <AdminTh>Notes</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.payments.map((payment) => (
                    <AdminTr key={payment.id}>
                      <AdminTd className="font-medium tabular-nums text-[#1a1a1a]">
                        {payment.receiptNumber ?? "—"}
                      </AdminTd>
                      <AdminTd className="font-semibold text-[#1a1a1a]">
                        {formatCurrency(Number(payment.amount))}
                        {payment.voidedAt ? (
                          <span className="ml-2 text-xs font-normal text-red-600">Voided</span>
                        ) : null}
                      </AdminTd>
                      <AdminTd>
                        <AdminStatusPill status={payment.method} />
                      </AdminTd>
                      <AdminTd className="text-[#4b5563]">{formatDateTime(payment.paidAt)}</AdminTd>
                      <AdminTd className="max-w-xs truncate text-[#4b5563]">
                        {payment.notes?.trim() || "—"}
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="mt-0">
          {patient.reminderCount === 0 ? (
            <TabEmpty message="No reminders for this patient." />
          ) : (
            <AdminTableCard>
              <AdminDataTable>
                <AdminTableHeader>
                  <AdminTh>Due</AdminTh>
                  <AdminTh>Message</AdminTh>
                  <AdminTh>Status</AdminTh>
                </AdminTableHeader>
                <AdminTableBody>
                  {patient.reminders.map((reminder) => (
                    <AdminTr key={reminder.id}>
                      <AdminTd className="font-medium text-[#1a1a1a]">
                        {formatDateTime(reminder.dueAt)}
                      </AdminTd>
                      <AdminTd className="max-w-md text-[#4b5563]">{reminder.message}</AdminTd>
                      <AdminTd>
                        <AdminStatusPill status={reminder.status} />
                      </AdminTd>
                    </AdminTr>
                  ))}
                </AdminTableBody>
              </AdminDataTable>
            </AdminTableCard>
          )}
        </TabsContent>
      </Tabs>

      <AdminFormDialog
        open={Boolean(viewingAppt)}
        onOpenChange={(open) => {
          if (!open) setViewingAppt(null);
        }}
        title="Appointment details"
        description={
          viewingAppt
            ? `${formatDateTime(viewingAppt.dateTime)}${
                viewingAppt.bookingReference ? ` · ${viewingAppt.bookingReference}` : ""
              }`
            : undefined
        }
        className="sm:max-w-xl"
      >
        {viewingAppt ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Status</p>
                <div className="mt-1">
                  <AdminStatusPill status={viewingAppt.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Source</p>
                <p className="mt-1 text-sm text-[#1a1a1a]">{bookedByLabel(viewingAppt.source)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
                  Duration
                </p>
                <p className="mt-1 text-sm text-[#1a1a1a]">
                  {viewingAppt.durationMinutes ?? 30} min
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
                  Payment preference
                </p>
                <p className="mt-1 text-sm text-[#1a1a1a]">
                  {paymentPreferenceLabel(viewingAppt.paymentPreference)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
                Appointment notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#4b5563]">
                {viewingAppt.notes?.trim() || "No notes recorded for this appointment."}
              </p>
            </div>

            <div className="border-t border-[#ebebeb] pt-3">
              <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                Prescriptions ({viewingAppt.prescriptions?.length ?? 0})
              </p>
              {!viewingAppt.prescriptions?.length ? (
                <p className="text-sm text-[#6b7177]">
                  {viewingAppt.status === "COMPLETED"
                    ? "No prescription was added for this visit."
                    : "No prescription yet — added after the visit is completed."}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {viewingAppt.prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#1a1a1a]">
                            {rx.diagnosis?.trim() || "Prescription"}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6b7177]">
                            {formatDate(rx.createdAt)}
                          </p>
                        </div>
                        <Link
                          href={`/admin/prescriptions/${rx.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--brand-teal)] hover:underline"
                        >
                          Print
                        </Link>
                      </div>
                      {rx.notes?.trim() ? (
                        <p className="mb-2 whitespace-pre-wrap text-sm text-[#4b5563]">{rx.notes}</p>
                      ) : null}
                      {rx.items.length === 0 ? (
                        <p className="text-sm text-[#6b7177]">No medicines listed.</p>
                      ) : (
                        <ul className="flex flex-col gap-1.5">
                          {rx.items.map((item) => (
                            <li
                              key={item.id}
                              className="rounded-md border border-[#e3e3e3] bg-white px-2.5 py-2 text-sm"
                            >
                              <p className="font-medium text-[#1a1a1a]">
                                {item.medicine.name}
                                {item.medicine.strength ? (
                                  <span className="ml-1 font-normal text-[#6b7177]">
                                    ({item.medicine.strength})
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-0.5 text-[#4b5563]">
                                {item.dosage}
                                {item.duration ? ` · ${item.duration}` : ""}
                                {item.instructions ? ` · ${item.instructions}` : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#ebebeb] pt-3">
              <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                Encounter & vitals ({viewingAppt.encounters?.length ?? 0})
              </p>
              {!viewingAppt.encounters?.length ? (
                <p className="text-sm text-[#6b7177]">
                  {viewingAppt.status === "COMPLETED"
                    ? "No encounter was recorded for this visit."
                    : "No encounter yet — vitals are recorded when the visit is completed."}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {viewingAppt.encounters.map((encounter) => (
                    <div
                      key={encounter.id}
                      className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] p-3"
                    >
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {encounter.chiefComplaint?.trim() || "Visit"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6b7177]">
                        {formatDateTime(encounter.visitedAt)}
                        {encounter.provider?.name ? ` · ${encounter.provider.name}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-[#4b5563]">
                        <span className="font-medium text-[#1a1a1a]">Vitals: </span>
                        {formatVitals(encounter.vitalsJson)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#4b5563]">
                        {encounter.notes?.trim() || "No clinical notes."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(viewingAppt.payments?.length ?? 0) > 0 ? (
              <div className="border-t border-[#ebebeb] pt-3">
                <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                  Payments ({viewingAppt.payments!.length})
                </p>
                <ul className="flex flex-col gap-1.5">
                  {viewingAppt.payments!.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e3e3e3] bg-white px-2.5 py-2 text-sm"
                    >
                      <span className="text-[#1a1a1a]">
                        {formatCurrency(payment.amount)} · {payment.method}
                        {payment.receiptNumber ? ` · ${payment.receiptNumber}` : ""}
                      </span>
                      <span className="text-xs text-[#6b7177]">
                        {formatDateTime(payment.paidAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-[#ebebeb] pt-3">
              <Button type="button" variant="outline" onClick={() => setViewingAppt(null)}>
                Close
              </Button>
              <Link
                href={`/admin/appointments/${viewingAppt.id}`}
                className={cn(buttonVariants())}
              >
                Edit appointment
              </Link>
            </div>
          </div>
        ) : null}
      </AdminFormDialog>
    </div>
  );
}
