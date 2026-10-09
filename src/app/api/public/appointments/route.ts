import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { publicAppointmentSchema } from "@/lib/schemas/clinic.schema";
import { createPublicAppointment } from "@/services/clinic.service";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`public-appointment:${ip}`, {
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
  const parsed = publicAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  try {
    const appointment = await createPublicAppointment(parsed.data);
    return Response.json(
      { bookingReference: appointment.bookingReference, status: appointment.status },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not book appointment";
    return Response.json({ error: message }, { status: 400 });
  }
}
