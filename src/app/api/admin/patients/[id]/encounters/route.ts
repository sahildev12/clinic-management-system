import { jsonError, requireModule } from "@/lib/api-auth";
import { encounterSchema } from "@/lib/schemas/clinic.schema";
import { createEncounter, listPatientEncounters } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  return Response.json(await listPatientEncounters(id));
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = encounterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const encounter = await createEncounter(id, parsed.data);
    return Response.json(encounter, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create encounter";
    return jsonError(message, 400);
  }
}
