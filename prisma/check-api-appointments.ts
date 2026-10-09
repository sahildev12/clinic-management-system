import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { listAppointments } from "../src/services/clinic.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const rahul = await prisma.provider.findFirst({
    where: { name: "Rahul TUK" },
    select: { id: true, clinicId: true, category: true },
  });
  if (!rahul) throw new Error("Rahul not found");

  const asDoctor = await listAppointments({
    dateFrom: "2026-09-15",
    dateTo: "2026-09-15",
    sort: "asc",
    viewer: {
      role: "STAFF",
      clinicId: rahul.clinicId,
      providerId: rahul.id,
      providerType: "DOCTOR",
      category: rahul.category,
    },
  });

  console.log("Doctor-scoped Sep 15 count:", asDoctor.length);
  for (const a of asDoctor) {
    console.log(a.dateTime.toString(), "|", a.patient.name, "|", a.status);
  }
}

main()
  .finally(() => prisma.$disconnect());
