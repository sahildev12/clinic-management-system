import { getTenantViewer, jsonError, requireModule } from "@/lib/api-auth";
import { paymentSchema } from "@/lib/schemas/clinic.schema";
import { createPayment, listPayments } from "@/services/clinic.service";

export async function GET(request: Request) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { searchParams } = new URL(request.url);
  const payments = await listPayments({
    method: searchParams.get("method") ?? undefined,
    includeVoided: searchParams.get("includeVoided") === "1",
  });
  return Response.json(payments);
}

export async function POST(request: Request) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const payment = await createPayment(parsed.data, viewer);
    return Response.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record payment";
    return jsonError(message, 400);
  }
}
