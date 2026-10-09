import { jsonError, requireModule } from "@/lib/api-auth";
import { prescriptionSchema } from "@/lib/schemas/clinic.schema";
import { createPrescription, listPrescriptions } from "@/services/clinic.service";

export async function GET() {
  const authResult = await requireModule("prescriptions");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const prescriptions = await listPrescriptions();
  return Response.json(prescriptions);
}

export async function POST(request: Request) {
  const authResult = await requireModule("prescriptions");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const prescription = await createPrescription(parsed.data, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json(prescription, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create prescription";
    return jsonError(message, 400);
  }
}
