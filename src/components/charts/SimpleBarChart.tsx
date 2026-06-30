"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SimpleBarChart({
  data,
  dataKey,
  color = "#00C48C"
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-muted">
        No chart data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)"
          }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
