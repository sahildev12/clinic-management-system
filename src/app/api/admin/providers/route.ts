import {
  getTenantViewer,
  jsonError,
  requireAdmin,
  tenantOptionsFromRequest,
} from "@/lib/api-auth";
import { providerCreateSchema } from "@/lib/schemas/clinic.schema";
import { createProvider, listProviders } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const viewer = await getTenantViewer();
  const opts = tenantOptionsFromRequest(request, viewer);
  const providers = await listProviders({
    activeOnly: searchParams.get("activeOnly") === "1",
    q: searchParams.get("q") ?? undefined,
    ...opts,
  });
  return Response.json(providers);
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = providerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const provider = await createProvider(parsed.data, viewer);
    return Response.json(provider, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add team member";
    return jsonError(message, 400);
  }
}
