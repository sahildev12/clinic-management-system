"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const EMPTY = "__empty__";

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  triggerClassName,
  disabled,
  id,
  allowEmpty,
  emptyLabel = "All",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  // Keep Select always controlled. `undefined` = uncontrolled; empty string becomes
  // controlled later and Base UI warns. Use `null` for "no selection" so the placeholder shows.
  const selectValue = value ? value : null;
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className={cn("w-full", className)}>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          const v = next == null ? "" : String(next);
          onValueChange(v === EMPTY ? "" : v);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          size="sm"
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "w-full min-w-0 border-input bg-transparent px-2.5 shadow-none",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent side="bottom" align="start" sideOffset={6}>
          {allowEmpty ? <SelectItem value={EMPTY}>{emptyLabel}</SelectItem> : null}
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
