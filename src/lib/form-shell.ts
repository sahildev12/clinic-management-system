import { cn } from "@/lib/utils";

export type FormShellProps = {
  /** Compact layout for dialogs (no card chrome). */
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function formShellClassName(embedded?: boolean, className?: string) {
  return cn(
    "space-y-3",
    embedded ? "pt-0.5" : "max-w-2xl rounded-xl border bg-white p-5",
    className
  );
}
