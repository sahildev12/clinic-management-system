"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  disablePast?: boolean;
  id?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function combine(date: Date, hour: string, minute: string) {
  const next = new Date(date);
  next.setHours(Number(hour), Number(minute), 0, 0);
  return next;
}

export function DateTimePickerField({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  disabled,
  disablePast,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value ?? new Date());
  const [prevValue, setPrevValue] = useState(value);
  const hour = value ? String(value.getHours()).padStart(2, "0") : "10";
  const minute = value
    ? String(((Math.round(value.getMinutes() / 15) * 15) % 60)).padStart(2, "0")
    : "00";

  if (value !== prevValue) {
    setPrevValue(value);
    if (value) setMonth(value);
  }

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">
          {value ? format(value, "dd MMM yyyy, hh:mm a") : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-0 overflow-visible p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={value ?? undefined}
          disabled={disablePast ? { before: today } : undefined}
          onSelect={(date) => {
            if (!date) {
              onChange(undefined);
              return;
            }
            onChange(combine(date, hour, minute));
          }}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Select
            value={hour}
            onValueChange={(h) => {
              const nextHour = String(h ?? "10");
              const base = value ?? new Date();
              onChange(combine(base, nextHour, minute));
            }}
          >
            <SelectTrigger className="w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select
            value={minute}
            onValueChange={(m) => {
              const nextMinute = String(m ?? "00");
              const base = value ?? new Date();
              onChange(combine(base, hour, nextMinute));
            }}
          >
            <SelectTrigger className="w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Local datetime string for APIs that previously used datetime-local. */
export function toDateTimePayload(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDatePayload(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
