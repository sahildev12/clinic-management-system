import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const doctors = await prisma.provider.findMany({
    where: { providerType: "DOCTOR" },
    select: { id: true, name: true, userId: true },
  });
  console.log("Doctors:", doctors);

  const start = new Date(2026, 8, 15);
  start.setHours(0, 0, 0, 0);
  const end = new Date(2026, 8, 15);
  end.setHours(23, 59, 59, 999);

  const appts = await prisma.appointment.findMany({
    where: { dateTime: { gte: start, lte: end } },
    include: {
      patient: { select: { name: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { dateTime: "asc" },
  });

  console.log(`\nAppointments on 2026-09-15 (local): ${appts.length}`);
  for (const a of appts) {
    console.log(
      `  ${a.dateTime.toString()} | Dr. ${a.provider?.name ?? "?"} | ${a.patient.name} | ${a.status}`
    );
  }

  const rahul = doctors.find((d) => d.name.includes("Rahul"));
  if (rahul) {
    const weekStart = new Date(2026, 8, 14);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(2026, 8, 20);
    weekEnd.setHours(23, 59, 59, 999);
    const rahulAppts = await prisma.appointment.findMany({
      where: { providerId: rahul.id, dateTime: { gte: weekStart, lte: weekEnd } },
      include: { patient: { select: { name: true } } },
      orderBy: { dateTime: "asc" },
    });
    console.log(`\nRahul TUK this week: ${rahulAppts.length}`);
    for (const a of rahulAppts) {
      console.log(`  ${a.dateTime.toString()} | ${a.patient.name} | ${a.status}`);
    }
  }
}

main()
  .finally(() => prisma.$disconnect());
