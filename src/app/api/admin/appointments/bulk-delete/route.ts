import { z } from "zod";

import { jsonError, requireModule } from "@/lib/api-auth";
import { deleteCancelledAppointments } from "@/services/clinic.service";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one appointment"),
});

export async function POST(request: Request) {
  const authResult = await requireModule("appointments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const result = await deleteCancelledAppointments(parsed.data.ids);
    return Response.json({ ok: true, count: result.count });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete appointments";
    return jsonError(message, 400);
  }
}
