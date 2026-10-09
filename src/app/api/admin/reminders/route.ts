import { getTenantViewer, jsonError, requireModule } from "@/lib/api-auth";
import { reminderSchema } from "@/lib/schemas/clinic.schema";
import { createReminder, listReminders } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireModule("reminders");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const reminders = await listReminders({
    status: searchParams.get("status") ?? undefined,
  });
  return Response.json(reminders);
}

export async function POST(request: Request) {
  const authResult = await requireModule("reminders");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = reminderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const reminder = await createReminder(parsed.data, viewer);
    return Response.json(reminder, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create reminder";
    return jsonError(message, 400);
  }
}
