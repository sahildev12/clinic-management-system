import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/PrintButton";
import { buttonVariants } from "@/components/ui/button";
import { loadAppointmentPrint } from "@/controllers/admin.controller";
import { appointmentSourceLabel, formatDateTime } from "@/lib/admin-format";
import { requireModulePage } from "@/lib/page-auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Print appointment" };

export default async function PrintAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Patient tracking links here, so the Patients module is enough on its own.
  await requireModulePage("appointments", "patients");
  const { id } = await params;
  const { appointment, settings } = await loadAppointmentPrint(id);
  if (!appointment) notFound();

  return (
    <div>
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href="/admin/appointments" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to appointments
        </Link>
        <Link
          href={`/admin/patients/${appointment.patientId}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Patient
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[640px] rounded-xl border bg-white p-8 print:border-0 print:p-0">
        <header className="mb-8 border-b pb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--brand-charcoal)]">{settings.clinicName}</h1>
          {settings.address ? (
            <p className="mt-1 text-sm text-muted-foreground">{settings.address}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {[settings.phone, settings.email].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#6b7177]">
            Appointment slip
          </p>
        </header>

        <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Booking ref:</span>{" "}
            {appointment.bookingReference ?? appointment.id}
          </p>
          <p>
            <span className="font-semibold">When:</span> {formatDateTime(appointment.dateTime)}
          </p>
          <p>
            <span className="font-semibold">Duration:</span> {appointment.durationMinutes} min
          </p>
          <p>
            <span className="font-semibold">Status:</span> {appointment.status}
          </p>
          <p>
            <span className="font-semibold">Source:</span>{" "}
            {appointmentSourceLabel(appointment.source)}
          </p>
          <p>
            <span className="font-semibold">Provider:</span>{" "}
            {appointment.provider?.name ?? "Unassigned"}
          </p>
          <p>
            <span className="font-semibold">Patient:</span> {appointment.patient.name}
          </p>
          <p>
            <span className="font-semibold">Reference:</span>{" "}
            {appointment.patient.patientReference}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {appointment.patient.phone}
          </p>
          {appointment.patient.email ? (
            <p>
              <span className="font-semibold">Email:</span> {appointment.patient.email}
            </p>
          ) : null}
        </div>

        {appointment.notes?.trim() ? (
          <p className="mt-4 text-sm">
            <span className="font-semibold">Notes:</span> {appointment.notes}
          </p>
        ) : null}

        <p className="mt-16 text-right text-sm text-muted-foreground">Authorized signature</p>
      </article>
    </div>
  );
}
