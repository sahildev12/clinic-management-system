import { getTenantViewer, jsonError, requireStaff } from "@/lib/api-auth";
import { providerScheduleSchema } from "@/lib/schemas/clinic.schema";
import { getProviderSchedule, updateProviderSchedule } from "@/services/clinic.service";

export async function GET() {
  const authResult = await requireStaff();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const viewer = await getTenantViewer();
  if (!viewer?.providerId || viewer.providerType !== "DOCTOR") {
    return jsonError("Doctor access required", 403);
  }

  try {
    const schedule = await getProviderSchedule(viewer.providerId);
    return Response.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load schedule";
    return jsonError(message, 400);
  }
}

export async function PUT(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const viewer = await getTenantViewer();
  if (!viewer?.providerId || viewer.providerType !== "DOCTOR") {
    return jsonError("Doctor access required", 403);
  }

  const body = await request.json();
  const parsed = providerScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const schedule = await updateProviderSchedule(viewer.providerId, parsed.data);
    return Response.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save schedule";
    return jsonError(message, 400);
  }
}
