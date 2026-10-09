import { jsonError, requireModule } from "@/lib/api-auth";
import { patientAllergySchema } from "@/lib/schemas/clinic.schema";
import { createPatientAllergy, listPatientAllergies } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  return Response.json(await listPatientAllergies(id));
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = patientAllergySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const allergy = await createPatientAllergy(id, parsed.data);
  return Response.json(allergy, { status: 201 });
}
