import {
  getTenantViewer,
  jsonError,
  requireModule,
  tenantOptionsFromRequest,
} from "@/lib/api-auth";
import { patientSchema } from "@/lib/schemas/clinic.schema";
import { ValidationError } from "@/lib/validation";
import { createPatient, listPatients } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const viewer = await getTenantViewer();
  const opts = tenantOptionsFromRequest(request, viewer);
  const patients = await listPatients(searchParams.get("q") ?? undefined, {
    ...opts,
    includeArchived: searchParams.get("includeArchived") === "1",
  });
  return Response.json(patients);
}

export async function POST(request: Request) {
  const authResult = await requireModule("patients");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const patient = await createPatient(parsed.data, viewer);
    return Response.json(patient, { status: 201 });
  } catch (error) {
    const message =
      error instanceof ValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not save patient";
    return jsonError(message, 400);
  }
}
