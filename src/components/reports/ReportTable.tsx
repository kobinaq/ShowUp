import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

type ReportRow = {
  id: string;
  lectureDate: Date;
  lecturerPresent: string;
  arrivalStatus: string | null;
  flags: Array<{ id: string }>;
  contest: { status: string } | null;
  latePing?: { acknowledgedAt: Date | null } | null;
  course: {
    code: string;
    title?: string;
    lecturer?: { firstName: string; lastName: string };
  };
};

export function ReportTable({ reports, showCourseTitle = false }: { reports: ReportRow[]; showCourseTitle?: boolean }) {
  if (!reports.length) return <p className="mt-4 text-sm text-muted">No reports found.</p>;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="py-2">Date</th>
            <th>Course</th>
            <th>Lecturer</th>
            <th>Presence</th>
            <th>Flags</th>
            <th>Ping</th>
            <th>Contest</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const href = `/reports/${report.id}`;
            return (
              <tr key={report.id} className="group border-t odd:bg-slate-50/70 hover:bg-accent/10 focus-within:bg-accent/10">
                <td><CellLink href={href} className="font-semibold">{report.lectureDate.toDateString()}</CellLink></td>
                <td><CellLink href={href} className="font-mono">{report.course.code}{showCourseTitle && report.course.title ? <span className="ml-2 font-sans text-muted">{report.course.title}</span> : null}</CellLink></td>
                <td><CellLink href={href}>{report.course.lecturer ? `${report.course.lecturer.firstName} ${report.course.lecturer.lastName}` : "-"}</CellLink></td>
                <td><CellLink href={href}><StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.lecturerPresent}</StatusBadge></CellLink></td>
                <td><CellLink href={href}>{report.flags.length}</CellLink></td>
                <td><CellLink href={href}>{report.latePing ? <span className={report.latePing.acknowledgedAt ? "text-green-600" : "text-amber-600"}>{report.latePing.acknowledgedAt ? "Alert acknowledged" : "Alert sent"}</span> : "-"}</CellLink></td>
                <td><CellLink href={href}>{report.contest ? <StatusBadge tone="amber">{report.contest.status}</StatusBadge> : "-"}</CellLink></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={`block min-h-12 px-2 py-3 outline-none group-hover:text-navy group-focus-within:text-navy ${className ?? ""}`}>{children}</Link>;
}
