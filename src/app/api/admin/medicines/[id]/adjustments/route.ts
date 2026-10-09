import { jsonError, requireModule } from "@/lib/api-auth";
import { inventoryAdjustmentSchema } from "@/lib/schemas/clinic.schema";
import { createInventoryAdjustment, listInventoryTransactions } from "@/services/clinic.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  return Response.json(await listInventoryTransactions(id));
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireModule("medicines");
  if (!authResult.ok) return jsonError(authResult.error, authResult.status);

  const { id } = await params;
  const body = await request.json();
  const parsed = inventoryAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  try {
    const medicine = await createInventoryAdjustment(id, parsed.data, {
      userId: authResult.session.user.id,
      email: authResult.session.user.email,
    });
    return Response.json(medicine, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not adjust stock";
    return jsonError(message, 400);
  }
}
