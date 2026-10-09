"use client";

import { Eye, Pencil } from "lucide-react";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { cn } from "@/lib/utils";

export function AdminIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label?: string;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? "Action"}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-[#6b7177] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a]",
        className
      )}
    >
      {children ?? <Pencil className="size-4" />}
    </button>
  );
}

export function AdminDeleteIconButton({
  endpoint,
  confirmMessage,
  confirmTitle,
  confirmLabel,
  successMessage,
}: {
  endpoint: string;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmLabel?: string;
  successMessage?: string;
}) {
  return (
    <DeleteButton
      endpoint={endpoint}
      confirmMessage={confirmMessage}
      confirmTitle={confirmTitle}
      confirmLabel={confirmLabel}
      successMessage={successMessage}
      icon
    />
  );
}

export function AdminRowActions({
  onView,
  onEdit,
  deleteEndpoint,
  deleteConfirm,
  deleteConfirmTitle,
  deleteConfirmLabel,
  deleteSuccessMessage,
  extra,
}: {
  onView?: () => void;
  onEdit?: () => void;
  deleteEndpoint?: string;
  deleteConfirm?: string;
  deleteConfirmTitle?: string;
  deleteConfirmLabel?: string;
  deleteSuccessMessage?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center justify-end gap-2">
      {extra}
      {onView ? (
        <AdminIconButton label="View" onClick={onView}>
          <Eye className="size-4" />
        </AdminIconButton>
      ) : null}
      {onEdit ? (
        <AdminIconButton label="Edit" onClick={onEdit}>
          <Pencil className="size-4" />
        </AdminIconButton>
      ) : null}
      {deleteEndpoint ? (
        <AdminDeleteIconButton
          endpoint={deleteEndpoint}
          confirmMessage={deleteConfirm}
          confirmTitle={deleteConfirmTitle}
          confirmLabel={deleteConfirmLabel}
          successMessage={deleteSuccessMessage}
        />
      ) : null}
    </div>
  );
}
