import { jsonError, requireModule } from "@/lib/api-auth";
import { patientConditionSchema } from "@/lib/schemas/clinic.schema";
import { deletePatientCondition, updatePatientCondition } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string; conditionId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id, conditionId } = await params;
  const body = await request.json();
  const parsed = patientConditionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const condition = await updatePatientCondition(id, conditionId, parsed.data);
    return Response.json(condition);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update condition";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id, conditionId } = await params;
  try {
    await deletePatientCondition(id, conditionId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete condition";
    return jsonError(message, 400);
  }
}
