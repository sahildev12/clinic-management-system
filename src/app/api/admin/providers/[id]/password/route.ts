import { jsonError, requireAdmin, writeAuditLog } from "@/lib/api-auth";
import { getProviderLoginPassword } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  try {
    const result = await getProviderLoginPassword(id);
    await writeAuditLog({
      actorUserId: authResult.session.user.id,
      actorEmail: authResult.session.user.email,
      action: "PROVIDER_PASSWORD_VIEW",
      entityType: "Provider",
      entityId: id,
      metadata: { available: result.available },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load password";
    return jsonError(message, 400);
  }
}
