import {
  clinicIdFromRequest,
  getTenantViewer,
  jsonError,
  requireAdmin,
  requireStaff,
} from "@/lib/api-auth";
import { clinicSettingSchema } from "@/lib/schemas/clinic.schema";
import { getClinicSettings, updateClinicSettings } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  const clinicId = clinicIdFromRequest(request);
  return Response.json(await getClinicSettings(clinicId));
}

export async function PUT(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = clinicSettingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const clinicId = clinicIdFromRequest(request);
    const settings = await updateClinicSettings(
      parsed.data,
      {
        userId: authResult.session.user.id,
        email: authResult.session.user.email,
      },
      viewer,
      clinicId
    );
    return Response.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save settings";
    return jsonError(message, 400);
  }
}
