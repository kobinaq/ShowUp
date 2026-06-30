"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils/cn";

type Tone = "green" | "red" | "amber" | "blue" | "grey";

export type DataTableColumn = {
  key: string;
  label: string;
  mono?: boolean;
  badge?: Record<string, Tone>;
};

export type DataTableRow = {
  id: string;
  href?: string;
  searchText: string;
  filters?: string[];
  cells: Record<string, string | number>;
};

export function DataTable({
  columns,
  rows,
  searchPlaceholder = "Search records...",
  filters = [],
  exportHref,
  emptyTitle = "No records found."
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  searchPlaceholder?: string;
  filters?: Array<{ label: string; value: string }>;
  exportHref?: string;
  emptyTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [dense, setDense] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = dense ? 12 : 8;

  const filtered = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    return rows
      .filter((row) => !lowerQuery || row.searchText.toLowerCase().includes(lowerQuery))
      .filter((row) => activeFilter === "all" || row.filters?.includes(activeFilter))
      .sort((a, b) => compareValues(a.cells[sortKey], b.cells[sortKey], sortDirection));
  }, [activeFilter, query, rows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-accent">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="min-h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ label: "All", value: "all" }, ...filters].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setActiveFilter(filter.value);
                setPage(1);
              }}
              className={cn(
                "min-h-10 rounded-lg border px-3 text-sm font-semibold",
                activeFilter === filter.value ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {filter.label}
            </button>
          ))}
          <button type="button" onClick={() => setDense((value) => !value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-slate-300">
            {dense ? "Comfortable" : "Compact"}
          </button>
          {exportHref ? (
            <Link href={exportHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-navy">
              <Download className="h-4 w-4" aria-hidden />
              Export
            </Link>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-sm font-bold text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3">
                  <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-2 font-bold">
                    {column.label}
                    <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map((row) => (
              <tr key={row.id} className="group hover:bg-accent/10 focus-within:bg-accent/10">
                {columns.map((column) => {
                  const value = String(row.cells[column.key] ?? "-");
                  const content = column.badge?.[value] ? <StatusBadge tone={column.badge[value]}>{value}</StatusBadge> : value;
                  return (
                    <td key={column.key} className={cn(dense ? "px-3 py-2" : "px-3 py-3", column.mono ? "font-mono" : "")}>
                      {row.href ? <Link href={row.href} className="block min-h-8 outline-none">{content}</Link> : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? <div className="bg-white px-4 py-10 text-center text-sm text-muted">{emptyTitle}</div> : null}
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{filtered.length} records</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-md border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50">Previous</button>
          <span className="font-mono text-xs">Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="rounded-md border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

function compareValues(first: string | number | undefined, second: string | number | undefined, direction: "asc" | "desc") {
  const a = first ?? "";
  const b = second ?? "";
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
  return direction === "asc" ? result : -result;
}
