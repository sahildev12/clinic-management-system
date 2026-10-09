import {
  getTenantViewer,
  jsonError,
  requireModule,
  tenantOptionsFromRequest,
} from "@/lib/api-auth";
import { appointmentSchema } from "@/lib/schemas/clinic.schema";
import { createAppointment, listAppointments } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireModule("appointments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const viewer = await getTenantViewer();
  const opts = tenantOptionsFromRequest(request, viewer);
  const calendar = searchParams.get("calendar") === "1";
  const appointments = await listAppointments({
    status: searchParams.get("status") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    providerId: searchParams.get("providerId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sort: calendar ? "asc" : "desc",
    take: calendar ? 1000 : 500,
    ...opts,
  });
  return Response.json(appointments);
}
