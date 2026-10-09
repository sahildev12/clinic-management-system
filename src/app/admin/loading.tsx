export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#e8e8e8]" />
      <div className="h-4 w-72 animate-pulse rounded bg-[#ececec]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-white" />
    </div>
  );
}
