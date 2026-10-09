import { jsonError, requireModule } from "@/lib/api-auth";
import { medicineSchema } from "@/lib/schemas/clinic.schema";
import { createMedicine, listMedicines } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const medicines = await listMedicines(searchParams.get("q") ?? undefined);
  return Response.json(medicines);
}

export async function POST(request: Request) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = medicineSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const medicine = await createMedicine(parsed.data);
  return Response.json(medicine, { status: 201 });
}
