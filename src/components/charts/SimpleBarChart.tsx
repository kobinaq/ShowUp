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
  return (
    <ResponsiveContainer width="100%" height="85%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
