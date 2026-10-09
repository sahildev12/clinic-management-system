"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AdminDataTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/admin-format";

type Transaction = {
  id: string;
  type: string;
  quantity: number;
  note?: string | null;
  createdAt: string | Date;
};

export function MedicineInventoryPanel({
  medicineId,
  currentStock,
  transactions,
}: {
  medicineId: string;
  currentStock: number;
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function onAdjust(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      toast.error("Enter a non-zero quantity (use negative to reduce stock)");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/medicines/${medicineId}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not adjust stock");
      return;
    }
    toast.success("Stock adjusted");
    setQuantity("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-[#e3e3e3] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Inventory adjustment</h2>
          <p className="text-sm text-[#6b7177]">
            Current stock: <span className="font-semibold text-[#1a1a1a]">{currentStock}</span>
          </p>
        </div>
        <form onSubmit={onAdjust} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty">Quantity (+/-)</Label>
            <Input
              id="adjust-qty"
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10 or -5"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="adjust-note">Note</Label>
            <Textarea
              id="adjust-note"
              rows={1}
              className="min-h-9 resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Received stock, damaged, count correction…"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Apply adjustment"}
            </Button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-[#1a1a1a]">Recent transactions</h2>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-white px-5 py-8 text-center text-sm text-[#6b7177]">
            No inventory transactions yet.
          </div>
        ) : (
          <AdminTableCard>
            <AdminDataTable>
              <AdminTableHeader>
                <AdminTh>When</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Quantity</AdminTh>
                <AdminTh>Note</AdminTh>
              </AdminTableHeader>
              <AdminTableBody>
                {transactions.map((tx) => (
                  <AdminTr key={tx.id}>
                    <AdminTd className="whitespace-nowrap text-[#4b5563]">
                      {formatDateTime(tx.createdAt)}
                    </AdminTd>
                    <AdminTd className="font-medium text-[#1a1a1a]">{tx.type}</AdminTd>
                    <AdminTd className="tabular-nums font-semibold">{tx.quantity}</AdminTd>
                    <AdminTd className="max-w-xs truncate text-[#4b5563]">
                      {tx.note?.trim() || "—"}
                    </AdminTd>
                  </AdminTr>
                ))}
              </AdminTableBody>
            </AdminDataTable>
          </AdminTableCard>
        )}
      </div>
    </div>
  );
}
