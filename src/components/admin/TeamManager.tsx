"use client";

import { Eye, EyeOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import { DoctorScheduleForm } from "@/components/admin/DoctorScheduleForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProviderForm } from "@/components/admin/ProviderForm";
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
import { AdminRowActions } from "@/components/admin/table/AdminRowActions";
import { AdminStatusPill } from "@/components/admin/table/AdminStatusPill";
import { AdminTableToolbar } from "@/components/admin/table/AdminTableToolbar";
import { Button } from "@/components/ui/button";
import { adminPrimaryButtonClassName } from "@/lib/admin-ui";
import { doctorCategoryLabel } from "@/lib/doctor-categories";
import { STAFF_MODULE_OPTIONS, sanitizeStaffModules } from "@/lib/staff-modules";

export type TeamMemberRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  providerType?: "DOCTOR" | "STAFF" | null;
  category?: string | null;
  moduleAccess?: string[] | null;
};

function MemberPasswordReveal({ memberId }: { memberId: string }) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setPassword(null);
    setUnavailable(false);
    setLoading(false);
  }, [memberId]);

  async function toggleReveal() {
    if (revealed) {
      setRevealed(false);
      return;
    }

    if (password !== null || unavailable) {
      setRevealed(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${memberId}/password`);
      const data = (await res.json().catch(() => ({}))) as {
        available?: boolean;
        password?: string | null;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not load password");
        return;
      }
      if (!data.available || !data.password) {
        setUnavailable(true);
        setPassword(null);
      } else {
        setPassword(data.password);
        setUnavailable(false);
      }
      setRevealed(true);
    } catch {
      toast.error("Could not load password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-medium text-muted-foreground">Password</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 break-all font-medium text-[#111827]">
          {loading
            ? "Loading…"
            : revealed
              ? unavailable
                ? "Not available — edit this member and set a new password to store it for viewing."
                : (password ?? "—")
              : "••••••••"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5"
          onClick={() => void toggleReveal()}
          disabled={loading}
          aria-label={revealed ? "Hide password" : "Show password"}
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {revealed ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}

export function TeamManager({
  members,
  hasActiveFilters = false,
  canViewPassword = false,
}: {
  members: TeamMemberRow[];
  hasActiveFilters?: boolean;
  canViewPassword?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberRow | null>(null);
  const [viewing, setViewing] = useState<TeamMemberRow | null>(null);
  const [scheduleFor, setScheduleFor] = useState<TeamMemberRow | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function handleSuccess() {
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  const emptyTitle = hasActiveFilters ? "No matching members" : "No members yet";
  const emptyDescription = hasActiveFilters
    ? "Try clearing search or adjusting your query."
    : "Add doctors or staff so they can sign in and be assigned to appointments.";

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <AdminPageHeader
        title="Doctors & team"
        description="One clinic — add doctors by specialization and staff with module access."
      />

      <Suspense fallback={<div className="mb-4 h-24 rounded-xl border bg-white" />}>
        <AdminTableToolbar
          resetHref="/admin/team"
          searchPlaceholder="Search name, phone, email…"
          action={
            <button type="button" className={adminPrimaryButtonClassName()} onClick={openCreate}>
              Add member
            </button>
          }
        />
      </Suspense>

      {members.length === 0 ? (
        <AdminEmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={hasActiveFilters ? undefined : "Add member"}
          onAction={hasActiveFilters ? undefined : openCreate}
        />
      ) : (
        <AdminTableCard>
          <AdminDataTable>
            <AdminTableHeader>
              <AdminTh>Name</AdminTh>
              <AdminTh>Type</AdminTh>
              <AdminTh>Specialization</AdminTh>
              <AdminTh>Phone</AdminTh>
              <AdminTh>Email</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </AdminTableHeader>
            <AdminTableBody>
              {members.map((member) => (
                <AdminTr key={member.id}>
                  <AdminTd>
                    <AdminPersonCell name={member.name} imageUrl={member.avatarUrl} />
                  </AdminTd>
                  <AdminTd className="text-[#4b5563]">
                    {member.providerType === "DOCTOR" ? "Doctor" : "Staff"}
                  </AdminTd>
                  <AdminTd className="text-[#4b5563]">
                    {member.providerType === "DOCTOR"
                      ? doctorCategoryLabel(member.category)
                      : "—"}
                  </AdminTd>
                  <AdminTd className="text-[#4b5563]">{member.phone ?? "—"}</AdminTd>
                  <AdminTd className="text-[#4b5563]">{member.email ?? "—"}</AdminTd>
                  <AdminTd>
                    <AdminStatusPill status={member.active ? "ACTIVE" : "INACTIVE"} />
                  </AdminTd>
                  <AdminTd>
                    <AdminRowActions
                      onView={() => setViewing(member)}
                      onEdit={() => {
                        setEditing(member);
                        setOpen(true);
                      }}
                      deleteEndpoint={`/api/admin/providers/${member.id}`}
                      deleteConfirmTitle="Remove member?"
                      deleteConfirm="Their login access will be removed and appointments will be unassigned. This cannot be undone."
                    />
                  </AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminDataTable>
        </AdminTableCard>
      )}

      <AdminFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit member" : "Add member"}
      >
        <ProviderForm
          key={editing?.id ?? "new"}
          provider={editing}
          embedded
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(viewing)}
        onOpenChange={(next) => {
          if (!next) setViewing(null);
        }}
        title="Member details"
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="relative inline-flex size-14 shrink-0 overflow-hidden rounded-full bg-[#eef2f7] text-sm font-semibold text-[var(--brand-navy)]">
                {viewing.avatarUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewing.avatarUrl.trim()}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    {viewing.name
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("") || "?"}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#111827]">{viewing.name}</p>
                <div className="mt-1">
                  <AdminStatusPill status={viewing.active ? "ACTIVE" : "INACTIVE"} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="font-medium text-[#111827]">{viewing.phone?.trim() || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="break-all font-medium text-[#111827]">
                  {viewing.email?.trim() || "—"}
                </p>
              </div>
              {canViewPassword ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Login</p>
                  <p className="text-[#4b5563]">
                    {viewing.providerType === "DOCTOR" ? "/doctor/login" : "/team/login"}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Type</p>
                <p className="font-medium text-[#111827]">
                  {viewing.providerType === "DOCTOR" ? "Doctor" : "Staff"}
                </p>
              </div>
              {viewing.providerType === "DOCTOR" ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Specialization</p>
                  <p className="font-medium text-[#111827]">
                    {doctorCategoryLabel(viewing.category)}
                  </p>
                </div>
              ) : null}
              {canViewPassword ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Module access</p>
                  <p className="text-[#4b5563]">
                    {sanitizeStaffModules(viewing.moduleAccess)
                      .map((key) => STAFF_MODULE_OPTIONS.find((m) => m.key === key)?.label ?? key)
                      .join(", ") || "None"}
                  </p>
                </div>
              ) : null}
              {canViewPassword ? <MemberPasswordReveal memberId={viewing.id} /> : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing.providerType === "DOCTOR" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setScheduleFor(viewing);
                    setViewing(null);
                  }}
                >
                  Schedule
                </Button>
              ) : null}
              <Button
                type="button"
                className={adminPrimaryButtonClassName("h-9")}
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        ) : null}
      </AdminFormDialog>

      <AdminFormDialog
        open={Boolean(scheduleFor)}
        onOpenChange={(next) => {
          if (!next) setScheduleFor(null);
        }}
        title={scheduleFor ? `Schedule — Dr. ${scheduleFor.name}` : "Schedule"}
      >
        {scheduleFor ? (
          <DoctorScheduleForm
            key={scheduleFor.id}
            providerId={scheduleFor.id}
            embedded
            onSuccess={() => {
              setScheduleFor(null);
              router.refresh();
            }}
            onCancel={() => setScheduleFor(null)}
          />
        ) : null}
      </AdminFormDialog>
    </div>
  );
}
