"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

const options = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "semester", label: "Semester" },
  { value: "year", label: "Academic year" }
];

export function DashboardPeriodSelect({ value }: { value: string }) {
  const router = useRouter();

  return (
    <label className="relative block">
      <span className="sr-only">Dashboard stats period</span>
      <select
        value={value}
        onChange={(event) => router.push(`/dashboard?period=${event.target.value}`)}
        className="min-h-10 appearance-none rounded-md border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-navy shadow-sm transition hover:border-primary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:bg-popover dark:text-popover-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </label>
  );
}
