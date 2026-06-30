import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-card">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-muted">
        <Inbox className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-semibold text-navy">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
