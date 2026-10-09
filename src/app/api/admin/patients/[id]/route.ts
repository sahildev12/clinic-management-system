import { jsonError, requireModule } from "@/lib/api-auth";
import { patientSchema } from "@/lib/schemas/clinic.schema";
import { archivePatient, updatePatient } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const patient = await updatePatient(id, parsed.data);
  return Response.json(patient);
}

/** Archives the patient (soft delete) rather than removing records. */
export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const patient = await archivePatient(id, {
    userId: authResult.session.user.id,
    email: authResult.session.user.email,
  });
  return Response.json({ ok: true, patient });
}
