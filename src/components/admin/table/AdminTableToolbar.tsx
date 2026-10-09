"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { toDatePayload } from "@/components/ui/date-time-picker-field";
import { Input } from "@/components/ui/input";
import { adminPrimaryButtonClassName, adminSecondaryButtonClassName } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export type ToolbarSelectFilter = {
  key: string;
  placeholder: string;
  emptyLabel: string;
  options: { value: string; label: string }[];
  widthClassName?: string;
};

type Props = {
  searchPlaceholder?: string;
  showDate?: boolean;
  selects?: ToolbarSelectFilter[];
  resetHref: string;
  className?: string;
  searchClassName?: string;
  /** Primary CTA (e.g. Record payment) — Renprints places this beside search. */
  action?: React.ReactNode;
};

export function AdminTableToolbar({
  searchPlaceholder = "Search…",
  showDate = false,
  selects = [],
  resetHref,
  className,
  searchClassName,
  action,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [date, setDate] = useState<Date | undefined>(() => {
    const raw = searchParams.get("date");
    return raw ? new Date(`${raw}T00:00:00`) : undefined;
  });
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of selects) initial[s.key] = searchParams.get(s.key) ?? "";
    return initial;
  });

  const paramsKey = searchParams.toString();
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey);
    setQ(searchParams.get("q") ?? "");
    const raw = searchParams.get("date");
    setDate(raw ? new Date(`${raw}T00:00:00`) : undefined);
    const next: Record<string, string> = {};
    for (const s of selects) next[s.key] = searchParams.get(s.key) ?? "";
    setSelectValues(next);
  }

  function pushFilters(next: {
    q?: string;
    date?: Date | undefined;
    selects?: Record<string, string>;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    const nextQ = next.q ?? q;
    const nextDate = next.date !== undefined ? next.date : date;
    const nextSelects = next.selects ?? selectValues;

    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");

    if (showDate && nextDate) params.set("date", toDatePayload(nextDate));
    else if (showDate) params.delete("date");

    for (const s of selects) {
      const value = nextSelects[s.key] ?? "";
      if (value) params.set(s.key, value);
      else params.delete(s.key);
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasFilters = showDate || selects.length > 0;

  return (
    <div className={cn("mb-4 flex flex-col gap-3 rounded-xl border border-[#e3e3e3] bg-white p-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className={cn("relative min-w-0 flex-1 lg:max-w-md", searchClassName)}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b7177]" />
          <Input
            value={q}
            onChange={(e) => {
              const value = e.target.value;
              setQ(value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                pushFilters({ q: value });
              }, 300);
            }}
            placeholder={searchPlaceholder}
            className="h-10 rounded-lg border-[#e3e3e3] pl-9 focus-visible:border-[var(--brand-teal)] focus-visible:ring-[var(--brand-teal)]/20"
          />
        </div>
        {action || !hasFilters ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!hasFilters ? (
              <Link
                href={resetHref}
                className={cn(
                  adminSecondaryButtonClassName(),
                  pending && "pointer-events-none opacity-50"
                )}
              >
                Reset
              </Link>
            ) : null}
            {action ? (
              <div className="[&_button]:h-9 [&_a]:h-9">{action}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-2.5">
          <span className="inline-flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#6b7177]">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Filters
          </span>
          {showDate ? (
            <div className="w-full min-w-[160px] sm:w-[180px]">
              <DatePickerField
                value={date}
                onChange={(value) => {
                  setDate(value);
                  pushFilters({ date: value });
                }}
                placeholder="Select date"
                className="h-10 rounded-lg border-[#e3e3e3]"
              />
            </div>
          ) : null}

          {selects.map((s) => (
            <div
              key={s.key}
              className={cn("min-w-0 w-full sm:w-auto", s.widthClassName ?? "sm:w-[180px]")}
            >
              <AppSelect
                value={selectValues[s.key] ?? ""}
                onValueChange={(value) => {
                  const next = { ...selectValues, [s.key]: value };
                  setSelectValues(next);
                  pushFilters({ selects: next });
                }}
                allowEmpty
                emptyLabel={s.emptyLabel}
                placeholder={s.placeholder}
                options={s.options}
                triggerClassName="h-10 min-h-10 rounded-lg border-[#e3e3e3] bg-white focus-visible:border-[var(--brand-teal)] focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]/20"
              />
            </div>
          ))}

          <Link
            href={resetHref}
            className={cn(
              adminSecondaryButtonClassName("gap-2"),
              pending && "pointer-events-none opacity-50"
            )}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </Link>
        </div>
      ) : null}
    </div>
  );
}
