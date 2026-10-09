import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Thrown for expected, user-facing validation failures inside the service
 * layer. API routes should catch this (or fall back to a generic Error
 * check) and respond with a 400 and `error.message`.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Parses `value` as a Date, throwing a `ValidationError` if it isn't one. */
export function assertValidDateTime(value: string | undefined | null, label: string): Date {
  if (!value) {
    throw new ValidationError(`${label} is required`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label} is invalid`);
  }
  return date;
}

type QueryClient = typeof prisma | Prisma.TransactionClient;

/**
 * Ensures `appointmentId` (when provided) exists and belongs to `patientId`.
 * Used everywhere an appointment reference is attached to a patient-scoped
 * record (payments, prescriptions, reminders, encounters) so one patient's
 * data can't be linked to another patient's appointment.
 */
export async function assertAppointmentBelongsToPatient(
  appointmentId: string,
  patientId: string,
  client: QueryClient = prisma
): Promise<void> {
  const appointment = await client.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true },
  });
  if (!appointment) {
    throw new ValidationError("Appointment not found");
  }
  if (appointment.patientId !== patientId) {
    throw new ValidationError("Appointment does not belong to the selected patient");
  }
}
