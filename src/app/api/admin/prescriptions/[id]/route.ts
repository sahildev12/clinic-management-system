import { jsonError, requireModule } from "@/lib/api-auth";
import { prescriptionSchema } from "@/lib/schemas/clinic.schema";
import { deletePrescription, getPrescription, updatePrescription } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("prescriptions");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const prescription = await getPrescription(id);
  if (!prescription) return jsonError("Prescription not found", 404);
  return Response.json(prescription);
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("prescriptions");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const prescription = await updatePrescription(id, parsed.data, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json(prescription);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update prescription";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("prescriptions");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  try {
    await deletePrescription(id, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete prescription";
    return jsonError(message, 400);
  }
}
