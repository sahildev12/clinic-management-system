import { jsonError, requireModule, getTenantViewer, tenantOptionsFromRequest } from "@/lib/api-auth";
import { appointmentNotesSchema } from "@/lib/schemas/clinic.schema";
import { updateAppointmentNotes } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await requireModule("appointments", "notes");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = appointmentNotesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const viewer = await getTenantViewer();
  const opts = tenantOptionsFromRequest(request, viewer);

  try {
    const appointment = await updateAppointmentNotes(id, parsed.data.notes, opts.viewer);
    return Response.json(appointment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save notes";
    return jsonError(message, 400);
  }
}
