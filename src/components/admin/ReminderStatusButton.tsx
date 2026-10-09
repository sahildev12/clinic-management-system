"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ReminderStatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = status === "DONE" ? "PENDING" : "DONE";

  async function onClick() {
    setLoading(true);
    const res = await fetch(`/api/admin/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not update reminder");
      return;
    }
    toast.success(next === "DONE" ? "Marked done" : "Reopened");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onClick}>
      {loading ? "…" : next === "DONE" ? "Mark done" : "Reopen"}
    </Button>
  );
}
