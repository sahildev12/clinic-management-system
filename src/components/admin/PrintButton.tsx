"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={cn(buttonVariants())}>
      Print
    </button>
  );
}
