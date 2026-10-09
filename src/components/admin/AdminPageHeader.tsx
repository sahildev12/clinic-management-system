import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({ title, description, action, className }: Props) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <header className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[#6b7177]">{description}</p> : null}
      </header>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
