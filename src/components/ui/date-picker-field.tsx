"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { startOfLocalDay } from "@/lib/booking-slots";
import { cn } from "@/lib/utils";

type Props = {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Disable specific calendar days (not the trigger button). */
  isDateDisabled?: (date: Date) => boolean;
  disablePast?: boolean;
  disableFuture?: boolean;
  /** Inclusive last selectable day (local calendar date). */
  maxDate?: Date;
  id?: string;
};

export function DatePickerField({
  value,
  onChange,
  placeholder = "Pick date",
  className,
  disabled = false,
  isDateDisabled,
  disablePast,
  disableFuture,
  maxDate,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value ?? new Date());
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value) setMonth(value);
  }

  const today = startOfLocalDay();
  const maxDay = maxDate ? startOfLocalDay(maxDate) : undefined;

  return (
    <div className="w-full min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-white px-2.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{value ? format(value, "dd MMM yyyy") : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto min-w-0 overflow-visible p-0"
          align="start"
          sideOffset={6}
          // Pointer opens: keep focus on the trigger so the page does not scroll
          // the calendar into view and nudge the form. Keyboard still focuses the popup.
          initialFocus={(openType) => openType === "keyboard"}
        >
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={value ?? undefined}
            startMonth={disablePast ? today : undefined}
            endMonth={maxDay}
            disabled={(date) => {
              const day = startOfLocalDay(date);
              if (disablePast && day < today) return true;
              if (disableFuture && day > today) return true;
              if (maxDay && day > maxDay) return true;
              return isDateDisabled?.(date) ?? false;
            }}
            onSelect={(date) => {
              onChange(date);
              if (date) setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
