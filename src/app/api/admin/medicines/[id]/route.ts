import { jsonError, requireModule } from "@/lib/api-auth";
import { medicineSchema } from "@/lib/schemas/clinic.schema";
import { deleteMedicine, updateMedicine } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = medicineSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const medicine = await updateMedicine(id, parsed.data);
  return Response.json(medicine);
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  try {
    await deleteMedicine(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete medicine";
    return jsonError(message, 400);
  }
}
