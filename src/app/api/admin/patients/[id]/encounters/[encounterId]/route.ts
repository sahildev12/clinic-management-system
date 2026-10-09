import { jsonError, requireModule } from "@/lib/api-auth";
import { encounterSchema } from "@/lib/schemas/clinic.schema";
import { deleteEncounter, updateEncounter } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string; encounterId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id, encounterId } = await params;
  const body = await request.json();
  const parsed = encounterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const encounter = await updateEncounter(id, encounterId, parsed.data);
    return Response.json(encounter);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update encounter";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id, encounterId } = await params;
  try {
    await deleteEncounter(id, encounterId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete encounter";
    return jsonError(message, 400);
  }
}
