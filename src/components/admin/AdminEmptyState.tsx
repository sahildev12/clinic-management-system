"use client";

import { adminPrimaryButtonClassName } from "@/lib/admin-ui";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminEmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-[#1a1a1a]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[#6b7177]">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className={adminPrimaryButtonClassName("mt-5")} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
