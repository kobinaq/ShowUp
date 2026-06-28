import { Inbox } from "lucide-react";

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-card border border-dashed border-slate-300 bg-white p-8 text-center shadow-card">
      <Inbox className="mb-3 h-8 w-8 text-muted" aria-hidden />
      <p className="font-semibold">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
