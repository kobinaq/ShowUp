import { cn } from "@/lib/utils/cn";

const tones = {
  green: "bg-accent/15 text-navy",
  red: "bg-danger/15 text-danger",
  amber: "bg-warning/20 text-navy",
  grey: "bg-slate-200 text-slate-700"
};

export function StatusBadge({ children, tone = "grey" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
