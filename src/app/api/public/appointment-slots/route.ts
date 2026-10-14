import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { listPublicAppointmentSlots } from "@/services/clinic.service";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`public-slots:${ip}`, {
    max: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return Response.json({ error: "Date is required" }, { status: 400 });
  }

  const clinicSlug = searchParams.get("clinicSlug")?.trim() || undefined;
  const providerId = searchParams.get("providerId")?.trim() || undefined;

  try {
    const result = await listPublicAppointmentSlots(date, { clinicSlug, providerId });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load slots";
    return Response.json({ error: message }, { status: 400 });
  }
}