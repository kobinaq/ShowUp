import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import type { AttentionItem } from "@/lib/services/role-attention";

export function NeedsAttentionList({
  items,
  emptyTitle = "Nothing needs your attention right now.",
  emptyDescription = "Flags, contests, and open work will appear here."
}: {
  items: AttentionItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex flex-col rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-navy/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-navy">{item.title}</p>
              <p className="text-xs text-muted">{item.detail}</p>
            </div>
            <span className="mt-2 text-xs font-semibold text-navy sm:mt-0">Open →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
