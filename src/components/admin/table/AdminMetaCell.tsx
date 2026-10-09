import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  className?: string;
  iconClassName?: string;
};

export function AdminMetaCell({ icon: Icon, label, className, iconClassName }: Props) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 text-sm text-[#4b5563]", className)}>
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7177]",
          iconClassName
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="truncate font-medium">{label}</span>
    </span>
  );
}
