import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { contactMessageSchema } from "@/lib/schemas/clinic.schema";
import { createContactMessage } from "@/services/clinic.service";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`public-contact:${ip}`, {
    max: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const message = await createContactMessage(parsed.data);
  return Response.json({ id: message.id }, { status: 201 });
}
