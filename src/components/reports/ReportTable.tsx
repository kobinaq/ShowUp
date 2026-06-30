import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

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

const columns: DataTableColumn[] = [
  { key: "date", label: "Date" },
  { key: "course", label: "Course", mono: true },
  { key: "lecturer", label: "Lecturer" },
  { key: "presence", label: "Presence", badge: { PRESENT: "green", ABSENT: "red", SUBSTITUTE: "blue" } },
  { key: "flags", label: "Flags" },
  { key: "ping", label: "Ping", badge: { "Alert acknowledged": "green", "Alert sent": "amber", "-": "grey" } },
  { key: "contest", label: "Contest", badge: { PENDING: "amber", ACCEPTED: "red", DISMISSED: "green", "-": "grey" } }
];

export function ReportTable({ reports, showCourseTitle = false, exportHref }: { reports: ReportRow[]; showCourseTitle?: boolean; exportHref?: string }) {
  const rows: DataTableRow[] = reports.map((report) => {
    const lecturer = report.course.lecturer ? `${report.course.lecturer.firstName} ${report.course.lecturer.lastName}` : "-";
    const course = showCourseTitle && report.course.title ? `${report.course.code} ${report.course.title}` : report.course.code;
    const ping = report.latePing ? (report.latePing.acknowledgedAt ? "Alert acknowledged" : "Alert sent") : "-";
    const contest = report.contest?.status ?? "-";
    return {
      id: report.id,
      href: `/reports/${report.id}`,
      searchText: `${report.lectureDate.toDateString()} ${course} ${lecturer} ${report.lecturerPresent} ${report.arrivalStatus ?? ""} ${contest}`,
      filters: [report.lecturerPresent, report.arrivalStatus ?? "", report.flags.length ? "FLAGGED" : "", contest].filter(Boolean),
      cells: {
        date: report.lectureDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
        course,
        lecturer,
        presence: report.lecturerPresent,
        flags: report.flags.length,
        ping,
        contest
      }
    };
  });

  return (
    <DataTable
      columns={columns}
      rows={rows}
      exportHref={exportHref}
      searchPlaceholder="Search reports by course, lecturer, date..."
      emptyTitle="No reports match this view."
      filters={[
        { label: "Absent", value: "ABSENT" },
        { label: "Late", value: "LATE" },
        { label: "Flagged", value: "FLAGGED" },
        { label: "Contested", value: "PENDING" }
      ]}
    />
  );
}
