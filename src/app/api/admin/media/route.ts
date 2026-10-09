import { jsonError, requireModule } from "@/lib/api-auth";
import { ValidationError } from "@/lib/validation";
import { listMediaAssets, uploadMediaAsset } from "@/services/media.service";
import type { MediaType } from "@/generated/prisma/client";

function parseMediaType(value: string | null): MediaType | undefined {
  if (value === "IMAGE" || value === "VIDEO") return value;
  return undefined;
}

export async function GET(request: Request) {
  const authResult = await requireModule("media");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  try {
    const result = await listMediaAssets({
      type: parseMediaType(searchParams.get("type")),
      q: searchParams.get("q") ?? undefined,
      page: Number(searchParams.get("page") ?? "1") || 1,
      pageSize: Number(searchParams.get("pageSize") ?? "24") || 24,
    });
    return Response.json(result);
  } catch (error) {
    console.error("GET /api/admin/media failed", error);
    const message =
      error instanceof Error ? error.message : "Could not load media";
    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  const authResult = await requireModule("media");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid upload payload", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Choose a file to upload", 400);
  }

  try {
    const asset = await uploadMediaAsset(file, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json(asset, { status: 201 });
  } catch (error) {
    const message =
      error instanceof ValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not upload file";
    return jsonError(message, 400);
  }
}
