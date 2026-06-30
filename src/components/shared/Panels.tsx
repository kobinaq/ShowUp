import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
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
  tone = "blue",
  href,
  badge,
  trend,
  footerTitle
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "blue" | "green" | "amber" | "red" | "grey";
  href?: string;
  badge?: string;
  trend?: "up" | "down" | "neutral";
  footerTitle?: string;
}) {
  const tones = {
    blue: "text-blue-700",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    grey: "text-slate-600"
  };
  const trendValue = trend ?? (tone === "red" || tone === "amber" ? "down" : tone === "grey" ? "neutral" : "up");
  const TrendIcon = trendValue === "up" ? TrendingUp : trendValue === "down" ? TrendingDown : Minus;
  const badgeText = badge ?? (trendValue === "up" ? "Healthy" : trendValue === "down" ? "Review" : "Scoped");
  const body = (
    <>
      <div className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted">{label}</p>
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2 py-1 text-xs font-semibold shadow-sm", tones[tone])}>
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            {badgeText}
          </span>
        </div>
        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-navy sm:text-3xl">{value}</p>
      </div>
      <div className="flex flex-col items-start gap-1.5 px-5 pb-5 text-sm">
        <div className="line-clamp-1 flex items-center gap-2 font-medium text-card-foreground">
          {footerTitle ?? helper ?? "Current scope performance"}
          <TrendIcon className="h-4 w-4" aria-hidden />
        </div>
        {helper ? <div className="text-muted">{helper}</div> : null}
      </div>
    </>
  );
  const className = "block overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--primary)_8%,transparent),var(--card))] shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-card";
  if (href) return <Link href={href} data-slot="card" className={className}>{body}</Link>;
  return <div data-slot="card" className={className}>{body}</div>;
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
