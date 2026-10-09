import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#f6f6f7] px-4 text-center">
      <h1 className="text-3xl font-bold text-[#1a1a1a]">Page not found</h1>
      <p className="max-w-md text-sm text-[#6b7177]">
        The page you requested does not exist or may have been moved.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Home
        </Link>
        <Link href="/admin" className={cn(buttonVariants())}>
          Admin dashboard
        </Link>
      </div>
    </div>
  );
}
