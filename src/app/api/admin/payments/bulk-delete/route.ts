import { z } from "zod";

import { jsonError, requireModule } from "@/lib/api-auth";
import { voidPayments } from "@/services/clinic.service";

const DEFAULT_VOID_REASON = "Voided from admin dashboard (bulk)";

const bulkVoidSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one payment"),
  reason: z.string().trim().min(1).max(500).optional(),
});

/** Bulk-voids payments (soft delete) rather than permanently deleting them. */
export async function POST(request: Request) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = bulkVoidSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const result = await voidPayments(parsed.data.ids, parsed.data.reason ?? DEFAULT_VOID_REASON, {
    userId: authResult.session.user.id,
    email: authResult.session.user.email,
  });
  return Response.json({ ok: true, count: result.count });
}
