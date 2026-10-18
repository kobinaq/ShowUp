import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";

const assignmentColumns: DataTableColumn[] = [
  { key: "course", label: "Course", mono: true },
  { key: "alias", label: "Rep alias" },
  { key: "duty", label: "Duty" },
  { key: "misses", label: "Missed reports" },
  { key: "flagged", label: "Reliability" }
];

const noDataColumns: DataTableColumn[] = [
  { key: "course", label: "Course", mono: true },
  { key: "date", label: "Session" },
  { key: "slot", label: "Timetable" },
  { key: "coverage", label: "Coverage" }
];

export default async function RepReliabilityPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");

  const courses = await prisma.course.findMany({
    where: andWhere({}, courseScope(profile)),
    select: { id: true }
  });
  const courseIds = courses.map((c) => c.id);

  const [assignments, flags, noDataSessions] = await Promise.all([
    prisma.repAssignment.findMany({
      where: { courseId: { in: courseIds }, isActive: true },
      include: {
        profile: { select: { anonymousAlias: true } },
        course: { select: { code: true, title: true } }
      },
      orderBy: [{ missedReportCount: "desc" }, { courseId: "asc" }]
    }),
    prisma.repReliabilityFlag.findMany({
      where: { isResolved: false, courseId: { in: courseIds } },
      include: { profile: { select: { anonymousAlias: true } } },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.lectureSession.findMany({
      where: { courseId: { in: courseIds }, reportCoverage: "NO_DATA" },
      include: {
        course: { select: { code: true } },
        schedule: { select: { startTime: true, endTime: true } }
      },
      orderBy: { lectureDate: "desc" },
      take: 40
    })
  ]);

  const assignmentRows: DataTableRow[] = assignments.map((item) => ({
    id: item.id,
    href: `/courses/${item.courseId}`,
    searchText: `${item.course.code} ${item.profile.anonymousAlias ?? ""} ${item.dutyRole}`,
    filters: [item.dutyRole],
    cells: {
      course: item.course.code,
      alias: item.profile.anonymousAlias ?? "—",
      duty: item.dutyRole,
      misses: String(item.missedReportCount),
      flagged: item.reliabilityFlaggedAt ? "Flagged" : "OK"
    }
  }));

  const noDataRows: DataTableRow[] = noDataSessions.map((item) => ({
    id: item.id,
    href: `/courses/${item.courseId}`,
    searchText: `${item.course.code} NO_DATA`,
    filters: ["NO_DATA"],
    cells: {
      course: item.course.code,
      date: item.lectureDate.toLocaleDateString(),
      slot: `${item.schedule.startTime}–${item.schedule.endTime}`,
      coverage: "NO_DATA (not lecture missed)"
    }
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Rep reliability"
        description="Backup escalation, late submissions, and NO_DATA coverage — missing reports never count as missed lectures."
      />

      {flags.length ? (
        <SectionPanel title="Repeated miss flags" description="Reps who repeatedly fail to report within the late window.">
          <ul className="space-y-2 text-sm">
            {flags.map((flag) => (
              <li key={flag.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="font-semibold">{flag.profile.anonymousAlias ?? "Rep"}</span> — {flag.message}
              </li>
            ))}
          </ul>
        </SectionPanel>
      ) : null}

      <SectionPanel title="Active reporters" description={`${assignments.length} active primary/backup assignments in your scope.`}>
        {assignmentRows.length ? (
          <DataTable
            columns={assignmentColumns}
            rows={assignmentRows}
            searchPlaceholder="Search reps..."
            emptyTitle="No active assignments."
            filters={[
              { label: "Primary", value: "PRIMARY" },
              { label: "Backup", value: "BACKUP" }
            ]}
          />
        ) : (
          <EmptyState title="No active reporters in scope." description="Assign a primary and backup rep per course from the course page." />
        )}
      </SectionPanel>

      <SectionPanel
        title="Sessions with no report data"
        description="These sessions have no class-rep submission after the late window. Lecturers are not marked absent from this alone."
      >
        {noDataRows.length ? (
          <DataTable columns={noDataColumns} rows={noDataRows} searchPlaceholder="Search NO_DATA sessions..." emptyTitle="No NO_DATA sessions." />
        ) : (
          <EmptyState title="No NO_DATA sessions." description="When a report window fully lapses with no submission, the session appears here." />
        )}
      </SectionPanel>
    </div>
  );
}
