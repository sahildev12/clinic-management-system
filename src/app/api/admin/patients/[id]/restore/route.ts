import { jsonError, requireModule } from "@/lib/api-auth";
import { restorePatient } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const patient = await restorePatient(id, {
    userId: authResult.session.user.id,
    email: authResult.session.user.email,
  });
  return Response.json({ ok: true, patient });
}
