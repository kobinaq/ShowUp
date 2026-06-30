import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel, Tabs } from "@/components/shared/Panels";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function LecturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const lecturer = await prisma.lecturer.findFirst({
    where: {
      id,
      ...(isSuperAdmin
        ? {}
        : isDepartmentScope
          ? { departmentId: profile?.departmentId ?? "__none__" }
          : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } })
    },
    include: {
      department: true,
      courses: {
        include: {
          reports: { include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true }, orderBy: { lectureDate: "desc" } }
        }
      },
      flags: true,
      notifications: true
    }
  });
  if (!lecturer) notFound();
  const coverage = await Promise.all(lecturer.courses.map((course) => coverageService.calculate(course.id).then((summary) => ({ course, ...summary }))));
  const reports = lecturer.courses.flatMap((course) => course.reports).sort((first, second) => second.lectureDate.getTime() - first.lectureDate.getTime());
  const pings = await prisma.latePing.findMany({
    where: { course: { lecturerId: lecturer.id } },
    include: { course: true, schedule: true },
    orderBy: { createdAt: "desc" }
  });
  const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const attendanceRate = reports.length ? Math.round((present / reports.length) * 100) : 0;
  const averageCoverage = coverage.length ? Math.round(coverage.reduce((sum, item) => sum + item.coveragePercent, 0) / coverage.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Lecturers", href: "/lecturers" }, { label: `${lecturer.firstName} ${lecturer.lastName}` }]}
        eyebrow={lecturer.department.name}
        title={`${lecturer.firstName} ${lecturer.lastName}`}
        description={`${lecturer.email} · ${lecturer.phone}`}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Courses" value={lecturer.courses.length} helper="Assigned courses" tone="blue" />
        <MetricCard label="Attendance" value={`${attendanceRate}%`} helper={`${reports.length} reports`} tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} />
        <MetricCard label="Coverage" value={`${averageCoverage}%`} helper="Average across courses" tone={averageCoverage >= 80 ? "green" : averageCoverage >= 60 ? "amber" : "red"} />
        <MetricCard label="Open flags" value={lecturer.flags.filter((flag) => !flag.isResolved).length} helper={`${lecturer.flags.length} total flags`} tone={lecturer.flags.some((flag) => !flag.isResolved) ? "amber" : "green"} />
      </section>
      <Tabs items={[
        { id: "overview", label: "Overview" },
        { id: "reports", label: "Reports", count: reports.length },
        { id: "flags", label: "Flags", count: lecturer.flags.length },
        { id: "pings", label: "Pings", count: pings.length },
        { id: "notifications", label: "Notifications", count: lecturer.notifications.length }
      ]} />
      <SectionPanel id="overview" title="Course coverage">
        <div className="grid gap-3 md:grid-cols-2">
          {coverage.map((item) => (
            <div key={item.course.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-semibold text-navy">{item.course.code}</span>
                <StatusBadge tone={item.pacingStatus === "Behind" ? "amber" : "green"}>{item.pacingStatus}</StatusBadge>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, item.coveragePercent)}%` }} />
              </div>
              <p className="mt-2 text-muted">{item.coveragePercent}% coverage</p>
            </div>
          ))}
        </div>
      </SectionPanel>
      <SectionPanel id="reports" title="Reports" description="All reports across this lecturer's courses.">
        <ReportTable reports={reports} showCourseTitle exportHref={`/api/export/scorecard/${lecturer.id}`} />
      </SectionPanel>
      <section id="flags" className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Flags">
          <div className="space-y-2">
            {lecturer.flags.length ? lecturer.flags.map((flag) => (
              <div key={flag.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono">{flag.type}</span>
                  <StatusBadge tone={flag.isResolved ? "green" : "amber"}>{flag.isResolved ? "Reviewed" : "Open"}</StatusBadge>
                </div>
                <p className="mt-1 text-muted">{flag.message}</p>
              </div>
            )) : <p className="text-sm text-muted">No flags recorded.</p>}
          </div>
        </SectionPanel>
        <SectionPanel id="notifications" title="Notifications">
          <div className="space-y-2">
            {lecturer.notifications.length ? lecturer.notifications.map((notification) => (
              <div key={notification.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{notification.channel}</span>
                  <StatusBadge tone={notification.status === "sent" ? "green" : notification.status === "failed" ? "red" : "grey"}>{notification.status}</StatusBadge>
                </div>
                <p className="mt-1 text-muted">{notification.sentAt.toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-muted">No notifications recorded.</p>}
          </div>
        </SectionPanel>
      </section>
      <SectionPanel id="pings" title="Ping history" description="Late alerts sent by class reps for this lecturer.">
        {pings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-sm font-bold text-muted"><tr><th className="px-3 py-3">Date</th><th>Course</th><th>Class time</th><th>Alert sent</th><th>Acknowledged</th><th>HOD notified</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{pings.map((ping) => (
                <tr key={ping.id} className="hover:bg-accent/10">
                  <td className="px-3 py-3">{ping.lectureDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-3 py-3 font-mono">{ping.course.code}</td>
                  <td className="px-3 py-3">{ping.schedule.startTime}-{ping.schedule.endTime}</td>
                  <td className="px-3 py-3">{ping.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-3">{ping.acknowledgedAt ? <StatusBadge tone="green">Acknowledged</StatusBadge> : <StatusBadge tone="amber">No response</StatusBadge>}</td>
                  <td className="px-3 py-3">{ping.hodNotified ? "Yes" : "-"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted">No late pings recorded.</p>}
      </SectionPanel>
    </div>
  );
}
