"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import {
  AdminDataTable,
  AdminPersonCell,
  AdminTableBody,
  AdminTableCard,
  AdminTableHeader,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/table/AdminDataTable";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { adminPrimaryButtonClassName, adminSecondaryButtonClassName } from "@/lib/admin-ui";
import { formatDateTime } from "@/lib/admin-format";

type Message = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
  read: boolean;
  createdAt: Date | string;
};

export function MessagesList({
  messages,
  footer,
  hasActiveFilters,
}: {
  messages: Message[];
  footer?: React.ReactNode;
  hasActiveFilters?: boolean;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<Message | null>(null);

  async function toggleRead(id: string, read: boolean) {
    const res = await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    if (!res.ok) {
      toast.error("Could not update message");
      return;
    }
    if (viewing?.id === id) {
      setViewing({ ...viewing, read });
    }
    router.refresh();
  }

  if (messages.length === 0) {
    return (
      <AdminEmptyState
        title={hasActiveFilters ? "No matching messages" : "No messages"}
        description={
          hasActiveFilters
            ? "Try clearing filters or adjusting your search."
            : "Contact form submissions from the website will appear here."
        }
      />
    );
  }

  return (
    <>
      <AdminTableCard>
        <AdminDataTable>
          <AdminTableHeader>
            <AdminTh>Sender</AdminTh>
            <AdminTh>Subject</AdminTh>
            <AdminTh>When</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh className="text-right">Actions</AdminTh>
          </AdminTableHeader>
          <AdminTableBody>
            {messages.map((msg) => (
              <AdminTr key={msg.id}>
                <AdminTd>
                  <AdminPersonCell
                    name={msg.name}
                    subtitle={[msg.phone, msg.email].filter(Boolean).join(" · ") || undefined}
                  />
                </AdminTd>
                <AdminTd className="font-medium">{msg.subject ?? "—"}</AdminTd>
                <AdminTd className="whitespace-nowrap text-[#4b5563]">
                  {formatDateTime(msg.createdAt)}
                </AdminTd>
                <AdminTd>
                  <AdminStatusPill status={msg.read ? "DONE" : "PENDING"} />
                </AdminTd>
                <AdminTd className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClassName()}
                      onClick={() => setViewing(msg)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className={adminSecondaryButtonClassName()}
                      onClick={() => toggleRead(msg.id, !msg.read)}
                    >
                      {msg.read ? "Mark unread" : "Mark read"}
                    </button>
                  </div>
                </AdminTd>
              </AdminTr>
            ))}
          </AdminTableBody>
        </AdminDataTable>
        {footer}
      </AdminTableCard>

      <AdminFormDialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        title={viewing?.subject?.trim() || "Contact message"}
        description={viewing ? formatDateTime(viewing.createdAt) : undefined}
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Name</p>
                <p className="mt-1 font-medium">{viewing.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Email</p>
                {viewing.email ? (
                  <a
                    href={`mailto:${viewing.email}`}
                    className="mt-1 inline-block font-medium text-[var(--brand-teal)] hover:underline"
                  >
                    {viewing.email}
                  </a>
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Phone</p>
                {viewing.phone ? (
                  <a
                    href={`tel:${viewing.phone.replace(/\s+/g, "")}`}
                    className="mt-1 inline-block font-medium text-[var(--brand-teal)] hover:underline"
                  >
                    {viewing.phone}
                  </a>
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Status</p>
                <div className="mt-1">
                  <AdminStatusPill status={viewing.read ? "DONE" : "PENDING"} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7177]">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-[#1a1a1a]">{viewing.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={adminSecondaryButtonClassName()}
                onClick={() => setViewing(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={adminPrimaryButtonClassName()}
                onClick={() => toggleRead(viewing.id, !viewing.read)}
              >
                {viewing.read ? "Mark unread" : "Mark read"}
              </button>
            </div>
          </div>
        ) : null}
      </AdminFormDialog>
    </>
  );
}