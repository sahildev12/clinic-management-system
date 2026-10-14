import {
  getTenantViewer,
  jsonError,
  requireModule,
  tenantOptionsFromRequest,
} from "@/lib/api-auth";
import { listAppointments } from "@/services/clinic.service";

export const dynamic = "force-dynamic";

/**
 * Polled by the admin screen to find NEW website bookings.
 * - Doctors only see bookings assigned to them (same scoping as the Appointments page).
 * - First call (no `since`) just returns the server time, so old bookings never ring.
 */
export async function GET(request: Request) {
  const authResult = await requireModule("appointments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const since = sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null;

  const now = new Date().toISOString();
  if (!since) {
    return Response.json({ now, items: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const viewer = await getTenantViewer();
  const opts = tenantOptionsFromRequest(request, viewer);
  const appointments = await listAppointments({
    source: "WEBSITE",
    status: "PENDING",
    sort: "desc",
    take: 100,
    ...opts,
  });

  const items = appointments
    .filter((appointment) => appointment.createdAt.getTime() > since.getTime())
    .map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patient.name,
      dateTime: appointment.dateTime.toISOString(),
      doctorName: appointment.provider?.name ?? null,
    }));

  return Response.json({ now, items }, { headers: { "Cache-Control": "no-store" } });
}
