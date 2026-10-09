import { getTenantViewer, jsonError, requireModule } from "@/lib/api-auth";
import { expenseSchema } from "@/lib/schemas/clinic.schema";
import { createExpense } from "@/services/clinic.service";

export async function POST(request: Request) {
  const authResult = await requireModule("finance");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const viewer = await getTenantViewer();
    const expense = await createExpense(parsed.data, viewer);
    return Response.json(expense, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record expense";
    return jsonError(message, 400);
  }
}
