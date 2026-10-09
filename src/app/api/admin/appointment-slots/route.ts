import { jsonError, requireModule } from "@/lib/api-auth";
import { listPublicAppointmentSlots } from "@/services/clinic.service";

/** Staff/admin slot lookup — same availability rules, no 40-day public window. */
export async function GET(request: Request) {
  const authResult = await requireModule("appointments", "patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return jsonError("Date is required", 400);

  const providerId = searchParams.get("providerId")?.trim() || undefined;

  try {
    const result = await listPublicAppointmentSlots(date, {
      enforceBookingWindow: false,
      providerId,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load slots";
    return jsonError(message, 400);
  }
}
