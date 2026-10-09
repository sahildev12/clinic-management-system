"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { DateTimePickerField, toDateTimePayload } from "@/components/ui/date-time-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/admin-format";
import { formShellClassName, type FormShellProps } from "@/lib/form-shell";

export type ExpenseFormValues = {
  id?: string;
  title: string;
  category: string;
  amount: number | string;
  vendor?: string | null;
  method: string;
  paidAt: Date | string;
  notes?: string | null;
};

function parseDate(value?: Date | string | null) {
  if (!value) return undefined;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function ExpenseForm({
  expense,
  embedded,
  onSuccess,
  onCancel,
}: {
  expense?: ExpenseFormValues | null;
} & FormShellProps) {
  const router = useRouter();
  const isEdit = Boolean(expense?.id);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(expense?.title ?? "");
  const [category, setCategory] = useState(expense?.category ?? "OTHER");
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : "");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [method, setMethod] = useState(expense?.method ?? "CASH");
  const [paidAt, setPaidAt] = useState<Date | undefined>(
    parseDate(expense?.paidAt) ?? new Date()
  );
  const [notes, setNotes] = useState(expense?.notes ?? "");

  function finish() {
    if (onSuccess) onSuccess();
    else {
      router.push("/admin/finance");
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
    const payload = {
      title,
      category,
      amount: Number(amount),
      vendor,
      method,
      paidAt: paidAt ? toDateTimePayload(paidAt) : "",
      notes,
    };

    const res = await fetch(
      isEdit ? `/api/admin/expenses/${expense!.id}` : "/api/admin/expenses",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not save expense");
      return;
    }
    toast.success(isEdit ? "Expense updated" : "Expense recorded");
    finish();
  }

  return (
    <form onSubmit={onSubmit} className={formShellClassName(embedded)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="expense-title">Title</Label>
          <Input
            id="expense-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly rent"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <AppSelect
            value={category}
            onValueChange={setCategory}
            options={EXPENSE_CATEGORY_OPTIONS}
            placeholder="Select category"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-vendor">Vendor</Label>
          <Input
            id="expense-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Payment method</Label>
          <AppSelect
            value={method}
            onValueChange={setMethod}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "ONLINE", label: "Online" },
            ]}
            placeholder="Select method"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Paid at</Label>
          <DateTimePickerField value={paidAt} onChange={setPaidAt} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="expense-notes">Notes</Label>
          <Textarea
            id="expense-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional details"
            rows={3}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Record expense"}
        </Button>
      </div>
    </form>
  );
}
