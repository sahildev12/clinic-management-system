import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type QueryClient = typeof prisma | Prisma.TransactionClient;

const MAX_ALLOCATION_ATTEMPTS = 12;

function parseSequence(prefix: string, ref: string | null | undefined): number {
  if (!ref) return 0;
  const match = new RegExp(`^${prefix}-(\\d+)$`, "i").exec(ref.trim());
  if (!match) return 0;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : 0;
}

async function allocateGlobalReference(
  prefix: "APT" | "RCP" | "EXP",
  client: QueryClient,
  lookup: (client: QueryClient) => Promise<string | null | undefined>,
  exists: (client: QueryClient, candidate: string) => Promise<boolean>
): Promise<string> {
  const lastRef = await lookup(client);
  let sequence = parseSequence(prefix, lastRef);

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
    sequence += 1;
    const candidate = `${prefix}-${String(sequence).padStart(6, "0")}`;
    if (!(await exists(client, candidate))) return candidate;
  }

  throw new Error(`Could not allocate a unique ${prefix} reference, please retry`);
}

/** Allocates a sequential, unique expense reference like `EXP-000001`. */
export async function allocateExpenseReference(client: QueryClient = prisma): Promise<string> {
  return allocateGlobalReference(
    "EXP",
    client,
    async (tx) => {
      const last = await tx.expense.findFirst({
        where: { referenceNumber: { startsWith: "EXP-" } },
        orderBy: { referenceNumber: "desc" },
        select: { referenceNumber: true },
      });
      return last?.referenceNumber;
    },
    async (tx, candidate) => {
      const existing = await tx.expense.findUnique({ where: { referenceNumber: candidate } });
      return Boolean(existing);
    }
  );
}

/** Allocates a sequential, unique receipt number like `RCP-000001`. */
export async function allocateReceiptNumber(client: QueryClient = prisma): Promise<string> {
  return allocateGlobalReference(
    "RCP",
    client,
    async (tx) => {
      const last = await tx.payment.findFirst({
        where: { receiptNumber: { startsWith: "RCP-" } },
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });
      return last?.receiptNumber;
    },
    async (tx, candidate) => {
      const existing = await tx.payment.findUnique({ where: { receiptNumber: candidate } });
      return Boolean(existing);
    }
  );
}

/** Allocates a sequential, unique booking reference like `APT-000001`. */
export async function allocateBookingReference(client: QueryClient = prisma): Promise<string> {
  return allocateGlobalReference(
    "APT",
    client,
    async (tx) => {
      const last = await tx.appointment.findFirst({
        where: { bookingReference: { startsWith: "APT-" } },
        orderBy: { bookingReference: "desc" },
        select: { bookingReference: true },
      });
      return last?.bookingReference;
    },
    async (tx, candidate) => {
      const existing = await tx.appointment.findUnique({ where: { bookingReference: candidate } });
      return Boolean(existing);
    }
  );
}
