import { jsonError, requireAdmin } from "@/lib/api-auth";
import { ValidationError } from "@/lib/validation";
import { deleteMediaAsset } from "@/services/media.service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireAdmin();
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  if (!id) return jsonError("Media id is required", 400);

  try {
    const deleted = await deleteMediaAsset(id, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json(deleted);
  } catch (error) {
    const message =
      error instanceof ValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not delete file";
    const status = message === "Media file not found" ? 404 : 400;
    return jsonError(message, status);
  }
}
