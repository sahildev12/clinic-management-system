"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  page: number;
  pageSize: number;
  itemName?: string;
};

function buildHref(
  pathname: string,
  searchParams: URLSearchParams,
  page: number,
  pageSize: number
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${pathname}?${params.toString()}`;
}

export function AdminTablePagination({ total, page, pageSize, itemName = "results" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("…");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] bg-white px-5 py-4">
      <p className="text-sm text-[#6b7177]">
        Showing <span className="font-medium text-[#1a1a1a]">{from}</span> to{" "}
        <span className="font-medium text-[#1a1a1a]">{to}</span> of{" "}
        <span className="font-medium text-[#1a1a1a]">{total}</span> {itemName}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={buildHref(pathname, searchParams, Math.max(1, safePage - 1), pageSize)}
            aria-label="Previous page"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border border-[#e3e3e3] text-[#6b7177] hover:bg-[#f6f6f7]",
              safePage <= 1 && "pointer-events-none opacity-40"
            )}
          >
            <ChevronLeft className="size-4" />
          </Link>
          {pages.map((p, idx) =>
            p === "…" ? (
              <span key={`e-${idx}`} className="px-1 text-sm text-[#9ca3af]">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={buildHref(pathname, searchParams, p, pageSize)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg text-sm font-semibold",
                  p === safePage
                    ? "bg-[var(--brand-teal)] text-white"
                    : "border border-[#e3e3e3] text-[#374151] hover:bg-[#f6f6f7]"
                )}
              >
                {p}
              </Link>
            )
          )}
          <Link
            href={buildHref(pathname, searchParams, Math.min(totalPages, safePage + 1), pageSize)}
            aria-label="Next page"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border border-[#e3e3e3] text-[#6b7177] hover:bg-[#f6f6f7]",
              safePage >= totalPages && "pointer-events-none opacity-40"
            )}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="w-[110px]">
          <AppSelect
            value={String(pageSize)}
            onValueChange={(value) => {
              router.push(buildHref(pathname, searchParams, 1, Number(value)));
            }}
            options={[
              { value: "10", label: "10 / page" },
              { value: "20", label: "20 / page" },
              { value: "50", label: "50 / page" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
