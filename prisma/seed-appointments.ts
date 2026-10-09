/**
 * Add sample appointments for the current week (no wipe).
 * Run: npm run db:seed:appointments
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function atHour(base: Date, daysOffset: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const SAMPLE_PATIENTS = [
  { name: "Priya Sharma", phone: "+919876500101" },
  { name: "Amit Patel", phone: "+919876500102" },
  { name: "Sneha Mehta", phone: "+919876500103" },
  { name: "Rohan Singh", phone: "+919876500104" },
  { name: "Kavya Desai", phone: "+919876500105" },
  { name: "Vikram Joshi", phone: "+919876500106" },
  { name: "Ananya Iyer", phone: "+919876500107" },
  { name: "Kabir Nair", phone: "+919876500108" },
];

async function nextBookingRef() {
  const last = await prisma.appointment.findFirst({
    where: { bookingReference: { startsWith: "APT-" } },
    orderBy: { bookingReference: "desc" },
    select: { bookingReference: true },
  });
  const n = last?.bookingReference?.match(/APT-(\d+)/)?.[1];
  const next = (n ? Number(n) : 0) + 1;
  return `APT-${String(next).padStart(6, "0")}`;
}

async function ensurePatients(clinicId: string) {
  const existing = await prisma.patient.findMany({
    where: { clinicId, archivedAt: null },
    take: 8,
    orderBy: { createdAt: "asc" },
  });
  if (existing.length >= 5) return existing;

  const counter = await prisma.patientReferenceCounter.upsert({
    where: { clinicId },
    create: { clinicId, nextValue: 2 },
    update: {},
  });
  let seq = counter.nextValue;

  const created = [...existing];
  for (const sample of SAMPLE_PATIENTS) {
    if (created.length >= 8) break;
    const dup = created.some((p) => p.phone === sample.phone);
    if (dup) continue;

    const ref = `PAT-${String(seq).padStart(6, "0")}`;
    seq += 1;
    const patient = await prisma.patient.create({
      data: {
        clinicId,
        patientReference: ref,
        name: sample.name,
        phone: sample.phone,
        gender: sample.name.split(" ")[0]!.endsWith("a") ? "FEMALE" : "MALE",
      },
    });
    created.push(patient);
  }

  await prisma.patientReferenceCounter.update({
    where: { clinicId },
    data: { nextValue: seq },
  });

  return created;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const settings = await prisma.clinicSetting.findFirst({ orderBy: { createdAt: "asc" } });
  const clinicId = settings?.clinicId ?? (await prisma.clinic.findFirst())?.id;
  if (!clinicId) throw new Error("No clinic found");

  const doctors = await prisma.provider.findMany({
    where: { clinicId, active: true, providerType: "DOCTOR" },
    include: { schedule: true },
  });

  if (doctors.length === 0) {
    throw new Error("No active doctors found — add a doctor in Doctors & team first");
  }

  const patients = await ensurePatients(clinicId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Mon–Sat offsets from start of current week (Monday)
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);

  const slots: Array<{
    dayOffset: number;
    hour: number;
    minute: number;
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
    source: "WEBSITE" | "WALK_IN";
    duration: number;
  }> = [
    { dayOffset: 0, hour: 9, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 0, hour: 9, minute: 30, status: "CONFIRMED", source: "WEBSITE", duration: 30 },
    { dayOffset: 0, hour: 10, minute: 0, status: "PENDING", source: "WEBSITE", duration: 30 },
    { dayOffset: 0, hour: 11, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 45 },
    { dayOffset: 0, hour: 14, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 0, hour: 15, minute: 0, status: "COMPLETED", source: "WALK_IN", duration: 30 },
    { dayOffset: 0, hour: 16, minute: 0, status: "CONFIRMED", source: "WEBSITE", duration: 30 },
    { dayOffset: 1, hour: 9, minute: 30, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 1, hour: 10, minute: 30, status: "PENDING", source: "WEBSITE", duration: 30 },
    { dayOffset: 1, hour: 14, minute: 30, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 2, hour: 11, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 2, hour: 15, minute: 0, status: "CONFIRMED", source: "WEBSITE", duration: 45 },
    { dayOffset: 3, hour: 10, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 3, hour: 16, minute: 30, status: "PENDING", source: "WEBSITE", duration: 30 },
    { dayOffset: 4, hour: 9, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
    { dayOffset: 4, hour: 11, minute: 30, status: "CONFIRMED", source: "WEBSITE", duration: 30 },
    { dayOffset: 5, hour: 10, minute: 0, status: "CONFIRMED", source: "WALK_IN", duration: 30 },
  ];

  let created = 0;
  let skipped = 0;

  for (const doctor of doctors) {
    const durationDefault = doctor.schedule?.appointmentDurationMinutes ?? 30;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      const patient = patients[(i + doctors.indexOf(doctor)) % patients.length]!;
      const dateTime = atHour(weekStart, slot.dayOffset, slot.hour, slot.minute);

      // Skip if same doctor/patient/time already exists
      const exists = await prisma.appointment.findFirst({
        where: {
          clinicId,
          providerId: doctor.id,
          patientId: patient.id,
          dateTime,
          status: { not: "CANCELLED" },
        },
      });
      if (exists) {
        skipped += 1;
        continue;
      }

      const bookingReference = await nextBookingRef();
      await prisma.appointment.create({
        data: {
          clinicId,
          patientId: patient.id,
          providerId: doctor.id,
          dateTime,
          durationMinutes: slot.duration || durationDefault,
          bookingReference,
          status: slot.status,
          source: slot.source,
          paymentPreference: slot.source === "WEBSITE" ? "ONLINE" : "COUNTER",
          notes:
            slot.status === "PENDING"
              ? "Awaiting confirmation"
              : slot.status === "COMPLETED"
                ? "Routine checkup completed"
                : "Scheduled visit",
        },
      });
      created += 1;
    }
  }

  console.log(`Sample appointments seeded: ${created} created, ${skipped} skipped (already exist)`);
  console.log(`Doctors: ${doctors.map((d) => d.name).join(", ")}`);
  console.log(`Week starting: ${weekStart.toDateString()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
