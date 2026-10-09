"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";

type Medicine = {
  id?: string;
  name: string;
  strength?: string | null;
  unit?: string | null;
  stock: number;
  reorderLevel?: number;
  notes?: string | null;
};

export function MedicineForm({
  medicine,
  embedded,
  onSuccess,
  onCancel,
}: { medicine?: Medicine | null } & FormShellProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(medicine?.id);

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/medicines");
      router.refresh();
    }
  }

  function cancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      strength: String(form.get("strength") ?? ""),
      unit: String(form.get("unit") ?? ""),
      stock: Number(form.get("stock") ?? 0),
      reorderLevel: Number(form.get("reorderLevel") ?? 10),
      notes: String(form.get("notes") ?? ""),
    };

    const res = await fetch(
      isEdit ? `/api/admin/medicines/${medicine!.id}` : "/api/admin/medicines",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save medicine");
      return;
    }
    toast.success(isEdit ? "Medicine updated" : "Medicine created");
    finish();
  }

  return (
    <form onSubmit={onSubmit} className={formShellClassName(embedded)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={medicine?.name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="strength">Strength</Label>
          <Input id="strength" name="strength" defaultValue={medicine?.strength ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" placeholder="tablet, ml…" defaultValue={medicine?.unit ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            min={0}
            defaultValue={medicine?.stock ?? 0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reorderLevel">Reorder level</Label>
          <Input
            id="reorderLevel"
            name="reorderLevel"
            type="number"
            min={0}
            defaultValue={medicine?.reorderLevel ?? 10}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            className="min-h-0 resize-y"
            defaultValue={medicine?.notes ?? ""}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update medicine" : "Create medicine"}
        </Button>
      </div>
    </form>
  );
}
