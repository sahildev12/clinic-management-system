import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { avatarColorsForName } from "@/lib/admin-avatars";
import { initials } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

export function AdminTableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminDataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Table className={cn("min-w-[720px] text-left text-sm", className)}>{children}</Table>;
}

export function AdminTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="border-b border-[#ebebeb] hover:bg-transparent">{children}</TableRow>
    </TableHeader>
  );
}

export function AdminTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-auto bg-[#fafafa] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#6b7177]",
        className
      )}
    >
      {children}
    </TableHead>
  );
}

export function AdminTableBody({ children }: { children: React.ReactNode }) {
  return <TableBody>{children}</TableBody>;
}

export function AdminTr({
  children,
  selected,
}: {
  children: React.ReactNode;
  selected?: boolean;
}) {
  return (
    <TableRow
      className={cn(
        "border-b border-[#f0f0f0] hover:bg-[#fafafa]",
        selected && "bg-[color-mix(in_oklab,var(--brand-teal)_6%,white)]"
      )}
    >
      {children}
    </TableRow>
  );
}

export function AdminTd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableCell className={cn("px-5 py-3.5 align-middle text-sm text-[#1a1a1a]", className)}>
      {children}
    </TableCell>
  );
}

export function AdminPersonCell({
  name,
  subtitle,
  imageUrl,
  avatarClassName,
}: {
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  avatarClassName?: string;
}) {
  const src = imageUrl?.trim() || "";
  const colors = avatarColorsForName(name);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "relative inline-flex size-9 shrink-0 overflow-hidden rounded-full text-xs font-semibold",
          avatarClassName
        )}
        style={src ? undefined : { backgroundColor: colors.bg, color: colors.fg }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">{initials(name)}</span>
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--brand-teal-dark)]">{name}</p>
        {subtitle ? <p className="truncate text-xs text-[#6b7177]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function AdminProviderCell({
  name,
  specialty,
  imageUrl,
}: {
  name: string;
  specialty?: string | null;
  imageUrl?: string | null;
}) {
  return (
    <AdminPersonCell
      name={name}
      subtitle={specialty?.trim() || "Provider"}
      imageUrl={imageUrl}
      avatarClassName="rounded-lg"
    />
  );
}
