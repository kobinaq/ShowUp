import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function ReportsPage() {
  const reports = await prisma.lectureReport.findMany({ include: { course: { include: { lecturer: true } }, flags: true, contest: true }, orderBy: { lectureDate: "desc" }, take: 100 });
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h1 className="font-display text-2xl font-bold">Reports</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2">Date</th><th>Course</th><th>Lecturer</th><th>Presence</th><th>Flags</th><th>Contest</th></tr></thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t odd:bg-slate-50/70">
                <td className="py-3"><Link href={`/reports/${report.id}`} className="font-semibold">{report.lectureDate.toDateString()}</Link></td>
                <td className="font-mono">{report.course.code}</td>
                <td>{report.course.lecturer.firstName} {report.course.lecturer.lastName}</td>
                <td><StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.lecturerPresent}</StatusBadge></td>
                <td>{report.flags.length}</td>
                <td>{report.contest ? <StatusBadge tone="amber">{report.contest.status}</StatusBadge> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
