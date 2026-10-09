import { jsonError, requireAdmin } from "@/lib/api-auth";
import { providerUpdateSchema } from "@/lib/schemas/clinic.schema";
import { deleteProvider, getProvider, updateProvider } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider) return jsonError("Team member not found", 404);
  const { user, ...rest } = provider;
  return Response.json({
    ...rest,
    hasLogin: Boolean(user),
  });
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = providerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const provider = await updateProvider(id, parsed.data);
    return Response.json(provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update team member";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  try {
    await deleteProvider(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove team member";
    return jsonError(message, 400);
  }
}
