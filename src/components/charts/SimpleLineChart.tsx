"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SimpleLineChart({
  data,
  dataKey,
  color = "var(--primary)",
  yAxisLabel
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color?: string;
  yAxisLabel?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-muted">
        No trend data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={{ stroke: "var(--border)" }} />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={{ stroke: "var(--border)" }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 12 } : undefined}
        />
        <Tooltip
          cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3 }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)"
          }}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
