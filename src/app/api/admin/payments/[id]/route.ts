import { jsonError, requireModule } from "@/lib/api-auth";
import { paymentSchema, voidPaymentSchema } from "@/lib/schemas/clinic.schema";
import { updatePayment, voidPayment } from "@/services/clinic.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { patient: true, appointment: true },
  });
  if (!payment) return jsonError("Payment not found", 404);
  return Response.json(payment);
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const payment = await updatePayment(id, parsed.data);
    return Response.json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update payment";
    return jsonError(message, 400);
  }
}

const DEFAULT_VOID_REASON = "Voided from admin dashboard";

/** Voids the payment (soft delete) instead of removing it permanently. */
export async function DELETE(request: Request, { params }: Params) {
  const authResult = await requireModule("payments");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;

  let reason = DEFAULT_VOID_REASON;
  try {
    const body = await request.json();
    const parsed = voidPaymentSchema.safeParse(body);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // No JSON body supplied — fall back to the default reason.
  }

  try {
    const payment = await voidPayment(id, reason, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json({ ok: true, payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not void payment";
    return jsonError(message, 400);
  }
}
