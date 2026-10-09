"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  count: number;
  noun?: string;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

export function AdminBulkBar({
  count,
  noun = "selected",
  onClear,
  onDelete,
  deleting,
}: Props) {
  if (count <= 0) return null;

  return (
    <div className="flex flex-col gap-3 border-b border-[#ebebeb] bg-[color-mix(in_oklab,var(--brand-teal)_8%,white)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-[#1a1a1a]">
        {count} {noun}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-9 items-center rounded-lg border border-[#e3e3e3] bg-white px-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#fafafa]"
        >
          Clear selection
        </button>
        <Button
          type="button"
          size="sm"
          disabled={deleting}
          onClick={onDelete}
          className="h-9 gap-2 rounded-lg bg-red-600 px-3 font-semibold text-white hover:bg-red-700"
        >
          <Trash2 className="size-4" />
          {deleting ? "Deleting…" : "Delete selected"}
        </Button>
      </div>
    </div>
  );
}
