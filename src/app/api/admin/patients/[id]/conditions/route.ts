import { jsonError, requireModule } from "@/lib/api-auth";
import { patientConditionSchema } from "@/lib/schemas/clinic.schema";
import { createPatientCondition, listPatientConditions } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  return Response.json(await listPatientConditions(id));
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = patientConditionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const condition = await createPatientCondition(id, parsed.data);
  return Response.json(condition, { status: 201 });
}
