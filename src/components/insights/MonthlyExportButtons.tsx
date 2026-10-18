"use client";

export function MonthlyExportButtons({ facultyId, departmentId }: { facultyId?: string; departmentId?: string }) {
  const params = new URLSearchParams();
  if (facultyId) params.set("facultyId", facultyId);
  if (departmentId) params.set("departmentId", departmentId);
  const qs = params.toString();
  const base = qs ? `/api/export/monthly?${qs}&` : "/api/export/monthly?";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}format=pdf`} className="inline-flex h-10 items-center rounded-md bg-navy px-3 text-sm font-semibold text-white">
        PDF
      </a>
      <a href={`${base}format=xlsx`} className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-navy">
        Excel
      </a>
      <a href={`${base}format=csv`} className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-navy">
        CSV
      </a>
    </div>
  );
}
