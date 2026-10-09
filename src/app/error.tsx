"use client";

import { useEffect } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#f6f6f7] px-4 text-center">
      <h1 className="text-3xl font-bold text-[#1a1a1a]">Something went wrong</h1>
      <p className="max-w-md text-sm text-[#6b7177]">
        An unexpected error occurred. You can try again or return to the dashboard.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className={cn(buttonVariants({ variant: "outline" }))}>
          Try again
        </button>
        <Link href="/admin" className={cn(buttonVariants())}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}
