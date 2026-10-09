import { jsonError, requireModule } from "@/lib/api-auth";
import { deletePatientAllergy } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string; allergyId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id, allergyId } = await params;
  try {
    await deletePatientAllergy(id, allergyId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete allergy";
    return jsonError(message, 400);
  }
}
