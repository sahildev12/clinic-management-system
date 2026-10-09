import { jsonError, requireModule } from "@/lib/api-auth";
import { appointmentSchema } from "@/lib/schemas/clinic.schema";
import { deleteAppointment, updateAppointment } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("appointments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const appointment = await updateAppointment(id, parsed.data);
    return Response.json(appointment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update appointment";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireModule("appointments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  try {
    await deleteAppointment(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete appointment";
    return jsonError(message, 400);
  }
}
