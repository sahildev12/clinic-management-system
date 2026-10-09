"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function AdminPatientSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        router.push(trimmed ? `/admin/patients?q=${encodeURIComponent(trimmed)}` : "/admin/patients");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search patient by name, ID or phone..."
        className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] pl-9 pr-3 text-sm text-[#111827] outline-none transition focus:border-[var(--brand-teal)] focus:bg-white focus:ring-2 focus:ring-[color-mix(in_oklab,var(--brand-teal)_20%,transparent)]"
      />
    </form>
  );
}
