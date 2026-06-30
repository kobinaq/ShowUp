import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel, Tabs } from "@/components/shared/Panels";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const course = await prisma.course.findFirst({
    where: {
      id,
      ...(isSuperAdmin
        ? {}
        : isDepartmentScope
          ? { departmentId: profile?.departmentId ?? "__none__" }
          : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } })
    },
    include: {
      lecturer: true,
      department: true,
      schedule: true,
      outline: { include: { topics: { orderBy: { order: "asc" } } } },
      reports: { include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true }, orderBy: { lectureDate: "desc" } },
      repAssignments: { include: { profile: true }, orderBy: { createdAt: "desc" } },
      latePings: true
    }
  });
  if (!course) notFound();
  const coverage = await coverageService.calculate(course.id);
  const presentReports = course.reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const attendanceRate = course.reports.length ? Math.round((presentReports / course.reports.length) * 100) : 0;
  const studentCountReports = course.classSize ? course.reports.filter((report) => typeof report.studentCount === "number") : [];
  const studentAttendanceRate = course.classSize && studentCountReports.length
    ? Math.round((studentCountReports.reduce((sum, report) => sum + (report.studentCount ?? 0), 0) / (studentCountReports.length * course.classSize)) * 100)
    : null;
  const activeRep = course.repAssignments.find((item) => item.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Courses", href: "/courses" }, { label: course.code }]}
        eyebrow={course.department.name}
        title={`${course.code} · ${course.title}`}
        description={`${course.lecturer.firstName} ${course.lecturer.lastName} teaches this course.`}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reports" value={course.reports.length} helper="Submitted sessions" tone="blue" />
        <MetricCard label="Attendance" value={`${attendanceRate}%`} helper="Non-absence reports" tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} />
        <MetricCard label="Student attendance" value={studentAttendanceRate === null ? "-" : `${studentAttendanceRate}%`} helper={course.classSize ? `Against class size of ${course.classSize}` : "Class size not set"} tone={studentAttendanceRate === null ? "grey" : studentAttendanceRate >= 80 ? "green" : studentAttendanceRate >= 60 ? "amber" : "red"} />
        <MetricCard label="Coverage" value={`${coverage.coveragePercent}%`} helper={coverage.pacingStatus} tone={coverage.pacingStatus === "Behind" ? "amber" : "green"} />
        <MetricCard label="Late pings" value={course.latePings.length} helper="Alerts sent for this course" tone={course.latePings.length ? "amber" : "green"} />
      </section>
      <Tabs items={[
        { id: "overview", label: "Overview" },
        { id: "reports", label: "Reports", count: course.reports.length },
        { id: "coverage", label: "Coverage", count: course.outline?.topics.length ?? 0 },
        { id: "reporter", label: "Reporter" },
        { id: "schedule", label: "Schedule", count: course.schedule.length }
      ]} />
      <section id="overview" className="grid gap-4 xl:grid-cols-3">
        <SectionPanel title="Course profile" className="xl:col-span-2">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="Department" value={course.department.name} />
            <Detail label="Lecturer" value={`${course.lecturer.firstName} ${course.lecturer.lastName}`} />
            <Detail label="Credit hours" value={course.creditHours.toString()} />
            <Detail label="Class size" value={course.classSize?.toString() ?? "Not set"} />
            <Detail label="Topics uploaded" value={(course.outline?.topics.length ?? 0).toString()} />
          </div>
        </SectionPanel>
        <SectionPanel title="Current reporter">
          {activeRep ? (
            <div>
              <p className="font-mono text-sm font-semibold text-navy">{activeRep.profile.anonymousAlias}</p>
              <p className="mt-2 text-sm text-muted">Assigned {activeRep.createdAt.toLocaleDateString()}</p>
            </div>
          ) : <p className="text-sm text-muted">No active reporter assigned.</p>}
        </SectionPanel>
      </section>
      <SectionPanel id="reports" title="Reports" description="Click any report row to open the full submitted report.">
        <ReportTable reports={course.reports} />
      </SectionPanel>
      <SectionPanel id="coverage" title="Outline coverage" description={`${coverage.taughtTopics}/${coverage.totalTopics} topics covered. Expected by now: ${coverage.expectedByNow}.`}>
        {course.outline?.topics.length ? (
          <ol className="grid gap-2 md:grid-cols-2">
            {course.outline.topics.map((topic) => <li key={topic.id} className="rounded-lg border border-slate-200 p-3 text-sm"><span className="font-semibold">Week {topic.weekNumber ?? "-"}</span>: {topic.title}</li>)}
          </ol>
        ) : <EmptyState title="No outline uploaded." description="Upload course topics from Admin so coverage analytics can track progress." />}
      </SectionPanel>
      <section id="reporter" className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Reporter rotation">
          <div className="space-y-2">
            {course.repAssignments.length ? course.repAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-mono">{assignment.profile.anonymousAlias}</span>
                <StatusBadge tone={assignment.isActive ? "green" : "grey"}>{assignment.isActive ? "Active" : "Inactive"}</StatusBadge>
              </div>
            )) : <p className="text-sm text-muted">No reporter assignments yet.</p>}
          </div>
        </SectionPanel>
        <SectionPanel id="schedule" title="Schedule">
          <div className="space-y-2">
            {course.schedule.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><span className="font-semibold">{dayName(item.dayOfWeek)}</span> · {item.startTime}-{item.endTime} · {item.venue ?? "No venue"}</div>)}
          </div>
        </SectionPanel>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold text-slate-600">{label}:</span> <span className="text-navy">{value}</span></p>;
}

function dayName(day: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? "Scheduled day";
}
