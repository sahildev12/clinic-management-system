"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteButton({
  endpoint,
  label = "Delete",
  confirmTitle = "Delete record?",
  confirmMessage = "This action cannot be undone.",
  confirmLabel = "Delete",
  successMessage = "Deleted",
  icon = false,
}: {
  endpoint: string;
  label?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  successMessage?: string;
  icon?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed");
      return;
    }
    toast.success(successMessage);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {icon ? (
        <button
          type="button"
          aria-label={label}
          disabled={loading}
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg text-[#6b7177] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          )}
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmLabel}
        loading={loading}
        onConfirm={onConfirm}
      />
    </>
  );
}
