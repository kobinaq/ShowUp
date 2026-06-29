import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const reportScope = isSuperAdmin
    ? {}
    : isDepartmentScope
      ? { course: { departmentId: profile?.departmentId ?? "__none__" } }
      : { course: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } };
  const lecturerScope = isSuperAdmin
    ? {}
    : isDepartmentScope
      ? { lecturer: { departmentId: profile?.departmentId ?? "__none__" } }
      : { lecturer: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } };
  const [reports, flags, contests] = await Promise.all([
    prisma.lectureReport.findMany({ where: reportScope, take: 6, orderBy: { lectureDate: "desc" }, include: { course: true } }),
    prisma.flag.count({ where: { isResolved: false, ...lecturerScope } }),
    prisma.contest.count({ where: { status: "PENDING", report: reportScope } })
  ]);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Recent reports" value={reports.length} />
        <Metric label="Open flags" value={flags} />
        <Metric label="Pending contests" value={contests} />
      </section>
      <section className="rounded-card bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Latest reports</h2>
          <Link href="/reports" className="text-sm font-semibold text-accent">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2">Date</th><th>Course</th><th>Presence</th><th>Late</th></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t odd:bg-slate-50/60">
                  <td className="py-3">{report.lectureDate.toDateString()}</td>
                  <td className="font-mono">{report.course.code}</td>
                  <td><StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : "green"}>{report.lecturerPresent}</StatusBadge></td>
                  <td>{report.lateMinutes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
    </div>
  );
}
