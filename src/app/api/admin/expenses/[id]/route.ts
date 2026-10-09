import { jsonError, requireModule } from "@/lib/api-auth";
import { expenseSchema, voidExpenseSchema } from "@/lib/schemas/clinic.schema";
import { getExpense, updateExpense, voidExpense } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("finance");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) return jsonError("Expense not found", 404);
  return Response.json(expense);
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireModule("finance");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const expense = await updateExpense(id, parsed.data);
    return Response.json(expense);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update expense";
    return jsonError(message, 400);
  }
}

const DEFAULT_VOID_REASON = "Voided from admin finance";

/** Voids the expense (soft delete) instead of removing it permanently. */
export async function DELETE(request: Request, { params }: Params) {
  const authResult = await requireModule("finance");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;

  let reason = DEFAULT_VOID_REASON;
  try {
    const body = await request.json();
    const parsed = voidExpenseSchema.safeParse(body);
    if (parsed.success) reason = parsed.data.reason;
  } catch {
    // No JSON body supplied — fall back to the default reason.
  }

  try {
    const expense = await voidExpense(id, reason, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json({ ok: true, expense });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not void expense";
    return jsonError(message, 400);
  }
}
