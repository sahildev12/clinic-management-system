import { z } from "zod";

import { jsonError, requireModule } from "@/lib/api-auth";
import { deleteReminder, updateReminderStatus } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await requireModule("reminders");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ status: z.enum(["PENDING", "DONE"]) }).safeParse(body);
  if (!parsed.success) return jsonError("Invalid status", 400);

  const reminder = await updateReminderStatus(id, parsed.data.status);
  return Response.json(reminder);
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("reminders");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  await deleteReminder(id);
  return Response.json({ ok: true });
}
