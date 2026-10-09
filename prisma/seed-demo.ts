/**
 * Wipe clinic clinical data and seed 20 realistic patients with full history.
 * Preserves admin/staff users, providers, settings, and media.
 *
 * Run: npm run db:seed:demo
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEFAULT_PATIENT_REFERENCE_TEMPLATE,
  formatPatientReference,
} from "../src/lib/patient-reference";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function atHour(base: Date, daysOffset: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pad(n: number, width = 6) {
  return String(n).padStart(width, "0");
}

const FIRST_NAMES_M = [
  "Aarav",
  "Rohan",
  "Vikram",
  "Kabir",
  "Arjun",
  "Ishaan",
  "Dev",
  "Nikhil",
  "Rahul",
  "Siddharth",
];
const FIRST_NAMES_F = [
  "Priya",
  "Sneha",
  "Ananya",
  "Meera",
  "Diya",
  "Kavya",
  "Isha",
  "Neha",
  "Pooja",
  "Riya",
];
const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Mehta",
  "Iyer",
  "Singh",
  "Desai",
  "Joshi",
  "Nair",
  "Kulkarni",
  "Reddy",
  "Gupta",
  "Khan",
  "Chopra",
  "Banerjee",
  "Pillai",
];
const AREAS = [
  "Baner",
  "Kothrud",
  "Aundh",
  "Hadapsar",
  "Wakad",
  "Viman Nagar",
  "FC Road",
  "MG Road",
  "Hinjewadi",
  "Kharadi",
];
const ALLERGIES = [
  { name: "Penicillin", severity: "Severe", notes: "Anaphylaxis risk — avoid all beta-lactams" },
  { name: "Sulfa drugs", severity: "Moderate", notes: "Rash with cotrimoxazole" },
  { name: "Aspirin", severity: "Mild", notes: "Gastric upset" },
  { name: "Dust mites", severity: "Moderate", notes: "Seasonal rhinitis" },
  { name: "Peanuts", severity: "Severe", notes: "Carry epinephrine if prescribed" },
  { name: "Latex", severity: "Mild", notes: "Contact dermatitis" },
  { name: "Ibuprofen", severity: "Moderate", notes: "Wheezing reported" },
  { name: "Seafood", severity: "Mild", notes: "Urticaria" },
];
const CONDITIONS = [
  { name: "Type 2 Diabetes Mellitus", status: "ACTIVE" as const, notes: "On metformin; HbA1c q3m" },
  { name: "Hypertension", status: "ACTIVE" as const, notes: "Target BP <140/90" },
  { name: "Asthma", status: "ACTIVE" as const, notes: "Uses inhaler PRN" },
  { name: "Hypothyroidism", status: "ACTIVE" as const, notes: "On thyroxine 50 mcg" },
  { name: "Migraine", status: "ACTIVE" as const, notes: "Triggers: stress, missed meals" },
  { name: "GERD", status: "ACTIVE" as const, notes: "Avoid spicy late meals" },
  { name: "Anemia (iron deficiency)", status: "RESOLVED" as const, notes: "Completed iron course 2025" },
  { name: "Seasonal allergic rhinitis", status: "ACTIVE" as const, notes: "Worse Feb–Apr" },
];
const COMPLAINTS = [
  "Fever and body ache for 2 days",
  "Tooth pain upper right",
  "Cough and cold",
  "Stomach pain after meals",
  "Headache and dizziness",
  "Follow-up diabetes review",
  "Skin rash on arms",
  "Back pain after lifting",
  "Sore throat",
  "Routine checkup",
];
const DIAGNOSES = [
  "Viral upper respiratory infection",
  "Acute gastritis",
  "Seasonal allergic rhinitis",
  "Dental caries — referred",
  "Essential hypertension — stable",
  "Type 2 DM — follow-up",
  "Acute pharyngitis",
  "Mechanical low back pain",
  "Contact dermatitis",
  "Migraine without aura",
];

async function wipeClinicalData(clinicId: string) {
  // Patients cascade to appointments, payments, reminders, prescriptions (+items),
  // allergies, conditions, encounters.
  const deletedPatients = await prisma.patient.deleteMany({ where: { clinicId } });
  await prisma.inventoryTransaction.deleteMany({ where: { medicine: { clinicId } } });
  await prisma.medicine.deleteMany({ where: { clinicId } });
  await prisma.contactMessage.deleteMany({ where: { clinicId } });
  await prisma.auditLog.deleteMany({ where: { clinicId } });

  await prisma.patientReferenceCounter.upsert({
    where: { clinicId },
    create: { clinicId, nextValue: 1 },
    update: { nextValue: 1 },
  });

  console.log(`Wiped ${deletedPatients.count} patients and related clinical data`);
}

async function nextPatientReference(clinicId: string) {
  const counter = await prisma.patientReferenceCounter.upsert({
    where: { clinicId },
    create: { clinicId, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
  });
  return formatPatientReference(DEFAULT_PATIENT_REFERENCE_TEMPLATE, counter.nextValue - 1);
}

let bookingSeq = 0;
let receiptSeq = 0;

function nextBookingRef() {
  bookingSeq += 1;
  return `APT-${pad(bookingSeq)}`;
}

function nextReceipt() {
  receiptSeq += 1;
  return `RCP-${pad(receiptSeq)}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  await wipeClinicalData(
    (
      await prisma.clinicSetting.findFirst({ orderBy: { createdAt: "asc" } })
    )?.clinicId ??
      (
        await prisma.clinic.findFirst({ orderBy: { createdAt: "asc" } })
      )?.id ??
      (() => {
        throw new Error("No clinic found — run migrations first");
      })()
  );

  const settings = await prisma.clinicSetting.findFirst({ orderBy: { createdAt: "asc" } });
  const clinicId = settings?.clinicId;
  if (!clinicId) {
    throw new Error("No clinic settings found — run migrations first");
  }
  if (settings) {
    await prisma.clinicSetting.update({
      where: { id: settings.id },
      data: {
        clinicName: settings.clinicName || "CarePlus Clinic",
        patientReferenceTemplate: DEFAULT_PATIENT_REFERENCE_TEMPLATE,
        phone: settings.phone || "020-2555-0101",
        email: settings.email || "hello@careplus.clinic",
        address: settings.address || "101 Health Avenue, Baner, Pune 411045",
      },
    });
  }

  const medicineDefs = [
    { name: "Paracetamol", strength: "500mg", unit: "tablet", stock: 480 },
    { name: "Amoxicillin", strength: "250mg", unit: "capsule", stock: 200 },
    { name: "Cetirizine", strength: "10mg", unit: "tablet", stock: 260 },
    { name: "Omeprazole", strength: "20mg", unit: "capsule", stock: 180 },
    { name: "Ibuprofen", strength: "400mg", unit: "tablet", stock: 220 },
    { name: "Metformin", strength: "500mg", unit: "tablet", stock: 300 },
    { name: "Amlodipine", strength: "5mg", unit: "tablet", stock: 240 },
    { name: "Azithromycin", strength: "500mg", unit: "tablet", stock: 120 },
    { name: "Vitamin D3", strength: "60k IU", unit: "capsule", stock: 150 },
    { name: "ORS", strength: "21g", unit: "sachet", stock: 100 },
  ];

  const medicines = await Promise.all(
    medicineDefs.map((m) =>
      prisma.medicine.create({
        data: { clinicId, ...m, notes: "DEMO_SEED", reorderLevel: 20 },
      })
    )
  );

  const provider = await prisma.provider.findFirst({ where: { active: true, clinicId } });
  const doctors = await prisma.provider.findMany({
    where: { clinicId, active: true, providerType: "DOCTOR" },
    orderBy: { name: "asc" },
  });
  const assignProvider = (index: number) =>
    doctors[index % doctors.length]?.id ?? provider?.id ?? null;
  const now = new Date();

  const patients = [];

  for (let i = 0; i < 20; i++) {
    const female = i % 2 === 1;
    const first = female ? FIRST_NAMES_F[i % FIRST_NAMES_F.length]! : FIRST_NAMES_M[i % FIRST_NAMES_M.length]!;
    const last = LAST_NAMES[i % LAST_NAMES.length]!;
    const name = `${first} ${last}`;
    const area = AREAS[i % AREAS.length]!;
    const phone = `+91${9000000000 + 10000 + i}`;
    const year = 1975 + (i % 30);
    const month = i % 12;
    const day = 1 + (i % 27);

    const patientReference = await nextPatientReference(clinicId);
    const patient = await prisma.patient.create({
      data: {
        clinicId,
        patientReference,
        name,
        phone,
        email: i % 5 === 0 ? null : `${first.toLowerCase()}.${last.toLowerCase()}@demo.clinic`,
        gender: female ? "FEMALE" : "MALE",
        dateOfBirth: new Date(year, month, day),
        address: `${10 + i}, Lane ${1 + (i % 8)}, ${area}, Pune 4110${pad(i % 50, 2)}`,
        notes:
          i % 4 === 0
            ? "Prefers morning appointments. Speak Marathi/Hindi."
            : i % 4 === 1
              ? "Bring previous reports on next visit."
              : null,
      },
    });
    patients.push(patient);

    // Allergies (1–3)
    const allergyCount = 1 + (i % 3);
    for (let a = 0; a < allergyCount; a++) {
      const allergy = ALLERGIES[(i + a) % ALLERGIES.length]!;
      await prisma.patientAllergy.create({
        data: {
          patientId: patient.id,
          name: allergy.name,
          severity: allergy.severity,
          notes: allergy.notes,
        },
      });
    }

    // Conditions (1–2)
    const conditionCount = 1 + (i % 2);
    for (let c = 0; c < conditionCount; c++) {
      const condition = CONDITIONS[(i + c) % CONDITIONS.length]!;
      await prisma.patientCondition.create({
        data: {
          patientId: patient.id,
          name: condition.name,
          status: condition.status,
          notes: condition.notes,
        },
      });
    }

    // Appointments: past completed, upcoming confirmed/pending, maybe cancelled
    const apptStatuses: Array<{
      days: number;
      hour: number;
      minute?: number;
      status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
      source: "WEBSITE" | "WALK_IN";
    }> = [
      { days: -21 - (i % 5), hour: 10 + (i % 3), status: "COMPLETED" as const, source: "WALK_IN" as const },
      { days: -7 - (i % 4), hour: 11 + (i % 2), status: "COMPLETED" as const, source: "WEBSITE" as const },
      {
        days: i % 3 === 0 ? 0 : 1 + (i % 4),
        hour: 9 + (i % 6),
        minute: i % 2 === 0 ? 0 : 30,
        status: (i % 4 === 0 ? "PENDING" : "CONFIRMED") as "PENDING" | "CONFIRMED",
        source: (i % 2 === 0 ? "WALK_IN" : "WEBSITE") as "WALK_IN" | "WEBSITE",
      },
    ];
    if (i % 5 === 0) {
      apptStatuses.push({
        days: -14,
        hour: 15,
        status: "CANCELLED",
        source: "WALK_IN",
      });
    }

    const patientAppts = [];
    for (let s = 0; s < apptStatuses.length; s++) {
      const spec = apptStatuses[s]!;
      const minute = "minute" in spec && typeof spec.minute === "number" ? spec.minute : 0;
      const hour = Math.min(17, Math.max(9, spec.hour === 13 ? 14 : spec.hour));
      const bookingReference = nextBookingRef();
      const appt = await prisma.appointment.create({
        data: {
          clinicId,
          patientId: patient.id,
          providerId: assignProvider(i + s),
          dateTime: atHour(now, spec.days, hour, minute),
          durationMinutes: 30,
          bookingReference,
          status: spec.status,
          source: spec.source,
          paymentPreference: spec.source === "WEBSITE" ? "ONLINE" : "COUNTER",
          notes:
            spec.status === "PENDING"
              ? "Awaiting confirmation call"
              : spec.status === "CANCELLED"
                ? "Patient cancelled — reschedule later"
                : spec.status === "COMPLETED"
                  ? `${COMPLAINTS[i % COMPLAINTS.length]}`
                  : `Upcoming: ${COMPLAINTS[i % COMPLAINTS.length]}`,
        },
      });
      patientAppts.push(appt);
    }

    // Encounters linked to completed visits
    const completed = patientAppts.filter((a) => a.status === "COMPLETED");
    for (let e = 0; e < completed.length; e++) {
      const appt = completed[e]!;
      await prisma.encounter.create({
        data: {
          patientId: patient.id,
          appointmentId: appt.id,
          providerId: assignProvider(i + e),
          visitedAt: appt.dateTime,
          chiefComplaint: COMPLAINTS[(i + e) % COMPLAINTS.length]!,
          notes: "Examined; advised rest and follow-up if symptoms persist.",
          vitalsJson: {
            BP: `${110 + (i % 30)}/${70 + (i % 15)}`,
            Pulse: `${68 + (i % 20)}`,
            Temp: `${97.8 + (i % 20) / 10} F`,
            Weight: `${55 + (i % 25)} kg`,
            SpO2: `${96 + (i % 4)}%`,
          },
        },
      });
    }

    // Prescriptions for completed visits
    for (let p = 0; p < completed.length; p++) {
      const appt = completed[p]!;
      const m1 = medicines[(i + p) % medicines.length]!;
      const m2 = medicines[(i + p + 3) % medicines.length]!;
      await prisma.prescription.create({
        data: {
          clinicId,
          patientId: patient.id,
          appointmentId: appt.id,
          diagnosis: DIAGNOSES[(i + p) % DIAGNOSES.length]!,
          notes: "Complete the full course. Review after 5 days if no improvement.",
          items: {
            create: [
              {
                medicineId: m1.id,
                dosage: "1 tablet twice daily",
                duration: "5 days",
                instructions: "After food",
                quantity: 10,
              },
              {
                medicineId: m2.id,
                dosage: "1 tablet once daily",
                duration: "7 days",
                instructions: "At night",
                quantity: 7,
              },
            ],
          },
        },
      });
    }

    // Payments for completed / some confirmed
    for (const appt of patientAppts) {
      if (appt.status === "CANCELLED" || appt.status === "PENDING") continue;
      if (appt.status === "CONFIRMED" && i % 3 !== 0) continue;
      const receiptNumber = nextReceipt();
      await prisma.payment.create({
        data: {
          clinicId,
          patientId: patient.id,
          appointmentId: appt.id,
          amount: 400 + (i % 5) * 100 + (appt.status === "COMPLETED" ? 150 : 0),
          method: i % 2 === 0 ? "ONLINE" : "CASH",
          paidAt: atHour(appt.dateTime, 0, appt.dateTime.getHours(), 20),
          receiptNumber,
          notes: appt.status === "COMPLETED" ? "Consultation fee" : "Advance / booking fee",
        },
      });
    }

    // Reminders
    const upcoming = patientAppts.find((a) => a.status === "CONFIRMED" || a.status === "PENDING");
    if (upcoming) {
      await prisma.reminder.create({
        data: {
          clinicId,
          patientId: patient.id,
          appointmentId: upcoming.id,
          dueAt: atHour(upcoming.dateTime, 0, Math.max(8, upcoming.dateTime.getHours() - 2), 0),
          message: `Remind ${name} about appointment (${patientReference})`,
          status: upcoming.dateTime.getTime() < now.getTime() ? "DONE" : "PENDING",
        },
      });
    }
    if (i % 2 === 0) {
      await prisma.reminder.create({
        data: {
          clinicId,
          patientId: patient.id,
          dueAt: atHour(now, 3 + (i % 4), 10, 0),
          message: `Follow-up call for ${name} — review labs / medicine compliance`,
          status: "PENDING",
        },
      });
    }
  }

  await prisma.contactMessage.createMany({
    data: [
      {
        clinicId,
        name: "Neha Kapoor",
        email: "neha@demo.clinic",
        phone: "9876500011",
        subject: "Timing enquiry",
        message: "Do you take walk-in patients after 5 PM on weekdays?",
        read: false,
      },
      {
        clinicId,
        name: "Amit Rao",
        email: "amit@demo.clinic",
        phone: "9876500012",
        subject: "Reports",
        message: "Can I collect blood reports without an appointment?",
        read: true,
      },
      {
        clinicId,
        name: "Divya Shah",
        email: "divya@demo.clinic",
        phone: "9876500013",
        subject: "New patient registration",
        message: "Looking to register my parents for a general checkup next week.",
        read: false,
      },
    ],
  });

  const counts = await Promise.all([
    prisma.patient.count(),
    prisma.patientAllergy.count(),
    prisma.patientCondition.count(),
    prisma.encounter.count(),
    prisma.appointment.count(),
    prisma.prescription.count(),
    prisma.payment.count(),
    prisma.reminder.count(),
    prisma.medicine.count(),
  ]);

  console.log("Demo data seeded successfully:");
  console.log(`  Patients:       ${counts[0]}`);
  console.log(`  Allergies:      ${counts[1]}`);
  console.log(`  Conditions:     ${counts[2]}`);
  console.log(`  Encounters:     ${counts[3]}`);
  console.log(`  Appointments:   ${counts[4]}`);
  console.log(`  Prescriptions:  ${counts[5]}`);
  console.log(`  Payments:       ${counts[6]}`);
  console.log(`  Reminders:      ${counts[7]}`);
  console.log(`  Medicines:      ${counts[8]}`);
  console.log("  Admin users / team / settings: preserved");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
