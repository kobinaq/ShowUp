"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FacultyAttendanceChart({ data }: { data: Array<{ name: string; attendance: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="85%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="attendance" fill="#00C48C" />
      </BarChart>
    </ResponsiveContainer>
  );
}
