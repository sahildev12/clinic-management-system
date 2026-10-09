import { getTenantViewer, jsonError, requireAdmin, requireModule, requireStaff } from "@/lib/api-auth";
import { providerScheduleSchema } from "@/lib/schemas/clinic.schema";
import { getProviderSchedule, updateProviderSchedule } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

async function canReadProviderSchedule(providerId: string) {
  const adminResult = await requireAdmin();
  if (adminResult.ok) return adminResult;

  const moduleResult = await requireModule("appointments", "patients");
  if (moduleResult.ok) return moduleResult;

  const staffResult = await requireStaff();
  if (!staffResult.ok) return staffResult;

  const viewer = await getTenantViewer();
  if (viewer?.providerType === "DOCTOR" && viewer.providerId === providerId) {
    return staffResult;
  }

  return { ok: false as const, status: 403 as const, error: "Forbidden" };
}

async function canManageProviderSchedule(providerId: string) {
  const adminResult = await requireAdmin();
  if (adminResult.ok) return adminResult;

  const staffResult = await requireStaff();
  if (!staffResult.ok) return staffResult;

  const viewer = await getTenantViewer();
  if (
    viewer?.providerType === "DOCTOR" &&
    viewer.providerId === providerId
  ) {
    return staffResult;
  }

  return { ok: false as const, status: 403 as const, error: "Forbidden" };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const authResult = await canReadProviderSchedule(id);
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  try {
    const schedule = await getProviderSchedule(id);
    return Response.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load schedule";
    return jsonError(message, 400);
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const authResult = await canManageProviderSchedule(id);
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = providerScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const schedule = await updateProviderSchedule(id, parsed.data);
    return Response.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save schedule";
    return jsonError(message, 400);
  }
}
