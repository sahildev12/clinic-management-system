import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MessagesList } from "@/components/admin/MessagesList";
import { AdminTablePagination } from "@/components/admin/table/AdminTablePagination";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { requireModulePage } from "@/lib/page-auth";
import { loadMessagesPage } from "@/controllers/admin.controller";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; clinicId?: string }>;
}) {
  await requireModulePage("messages");
  const search = await searchParams;
  const { messages, total, page, pageSize } = await loadMessagesPage(search);
  const hasActiveFilters = Boolean(search.q?.trim());

  return (
    <div>
      <AdminPageHeader title="Messages" description="Website contact form inbox." />

      <Suspense fallback={<div className="mb-4 h-14 rounded-2xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/messages"
          searchPlaceholder="Search name, email, subject…"
        />
      </Suspense>

      <MessagesList
        messages={messages}
        hasActiveFilters={hasActiveFilters}
        footer={
          messages.length > 0 ? (
            <Suspense>
              <AdminTablePagination total={total} page={page} pageSize={pageSize} />
            </Suspense>
          ) : null
        }
      />
    </div>
  );
}
