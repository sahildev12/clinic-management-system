import { z } from "zod";

import { jsonError, requireModule } from "@/lib/api-auth";
import { listContactMessages, markMessageRead } from "@/services/clinic.service";

export async function GET() {
  const authResult = await requireModule("messages");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);
  return Response.json(await listContactMessages());
}

export async function PATCH(request: Request) {
  const authResult = await requireModule("messages");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = z.object({ id: z.string(), read: z.boolean() }).safeParse(body);
  if (!parsed.success) return jsonError("Invalid data", 400);

  const message = await markMessageRead(parsed.data.id, parsed.data.read);
  return Response.json(message);
}
