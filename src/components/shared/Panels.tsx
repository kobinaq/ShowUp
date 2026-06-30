import { cn } from "@/lib/utils/cn";

export function SectionPanel({
  id,
  title,
  description,
  action,
  children,
  className
}: {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-card", className)}>
      {(title || description || action) ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="font-display text-lg font-bold text-navy">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "blue"
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "blue" | "green" | "amber" | "red" | "grey";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50/50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    red: "border-red-100 bg-red-50/70 text-red-700",
    grey: "border-slate-200 bg-white text-slate-600"
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className={cn("h-2.5 w-2.5 rounded-full border", tones[tone])} aria-hidden />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-navy">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}

export function Tabs({ items }: { items: Array<{ id: string; label: string; count?: number }> }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold",
            index === 0 ? "border-accent text-navy" : "border-transparent text-muted hover:border-slate-300 hover:text-navy"
          )}
        >
          {item.label}
          {typeof item.count === "number" ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.count}</span> : null}
        </a>
      ))}
    </div>
  );
}
