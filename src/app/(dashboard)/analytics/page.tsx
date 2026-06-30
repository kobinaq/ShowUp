import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { createClient } from "@/lib/supabase/server";
import { coverageService } from "@/lib/services/coverage.service";
import { displayText } from "@/lib/utils/displayText";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel } from "@/components/shared/Panels";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: {
          role: true,
          universityId: true,
          departmentId: true,
          university: { select: { name: true } },
          department: { select: { name: true } }
        }
      })
    : null;

  const role = profile?.role ?? Role.HOD;
  const isSuperAdmin = role === Role.SUPER_ADMIN;
  const isDepartmentScope = role === Role.HOD || role === Role.HOD_ASSISTANT;
  const universityId = profile?.universityId ?? "__none__";
  const departmentId = profile?.departmentId ?? "__none__";
  const courseWhere = isSuperAdmin
    ? {}
    : isDepartmentScope
      ? { departmentId }
      : { department: { faculty: { universityId } } };

  const courses = await prisma.course.findMany({
    where: courseWhere,
    include: {
      lecturer: true,
      department: { include: { faculty: true } },
      reports: { where: { isVoided: false }, include: { flags: true, contest: true } },
      outline: { include: { topics: true } },
      latePings: true
    },
    orderBy: { code: "asc" }
  });

  const reports = courses.flatMap((course) => course.reports.map((report) => ({ ...report, course })));
  const flags = reports.flatMap((report) => report.flags.map((flag) => ({ ...flag, report })));
  const contests = reports.flatMap((report) => report.contest ? [{ ...report.contest, report }] : []);
  const pings = courses.flatMap((course) => course.latePings);
  const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const absences = reports.filter((report) => report.lecturerPresent === "ABSENT").length;
  const lateness = reports.filter((report) => report.arrivalStatus === "LATE").length;
  const unresolvedFlags = flags.filter((flag) => !flag.isResolved).length;
  const openContests = contests.filter((contest) => contest.status === "PENDING").length;
  const acknowledgedPings = pings.filter((ping) => ping.acknowledgedAt).length;

  const coverage = await Promise.all(courses.map(async (course) => ({ course, ...(await coverageService.calculate(course.id)) })));
  const averageCoverage = coverage.length ? Math.round(coverage.reduce((sum, item) => sum + item.coveragePercent, 0) / coverage.length) : 0;
  const attendanceRate = reports.length ? Math.round((present / reports.length) * 100) : 0;
  const pingAcknowledgementRate = pings.length ? Math.round((acknowledgedPings / pings.length) * 100) : 0;
  const attendanceChart = buildAttendanceChart(courses, isSuperAdmin, isDepartmentScope);
  const flagChart = Object.entries(groupByCount(flags, (flag) => displayText(flag.type))).map(([name, count]) => ({ name, count }));
  const coverageChart = Object.entries(groupByCount(coverage, (item) => item.pacingStatus)).map(([name, count]) => ({ name, count }));
  const topFlaggedLecturers = Object.entries(groupByCount(flags, (flag) => `${flag.report.course.lecturer.firstName} ${flag.report.course.lecturer.lastName}`))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const behindCourses = coverage
    .filter((item) => item.pacingStatus === "Behind")
    .sort((a, b) => a.coveragePercent - b.coveragePercent)
    .slice(0, 5);
  const recentContests = contests.sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime()).slice(0, 5);
  const scopeTitle = isSuperAdmin ? "All universities" : isDepartmentScope ? profile?.department?.name ?? "Your department" : profile?.university?.name ?? "Your university";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={scopeTitle} title="Analytics" description="Executive indicators for attendance, topic coverage, late alerts, flags, and contested reports." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance rate" value={`${attendanceRate}%`} helper={`${reports.length} reports analyzed`} tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} />
        <MetricCard label="Average coverage" value={`${averageCoverage}%`} helper={`${courses.length} courses in scope`} tone={averageCoverage >= 80 ? "green" : averageCoverage >= 60 ? "amber" : "red"} />
        <MetricCard label="Absences" value={absences} helper="Total absence reports" tone={absences ? "red" : "green"} />
        <MetricCard label="Lateness" value={lateness} helper="Total late reports" tone={lateness ? "amber" : "green"} />
        <MetricCard label="Open flags" value={unresolvedFlags} helper={`${flags.length} total flags`} tone={unresolvedFlags ? "amber" : "green"} />
        <MetricCard label="Open contests" value={openContests} helper="Pending challenge reviews" tone={openContests ? "red" : "green"} />
        <MetricCard label="Ping acknowledgement" value={`${pingAcknowledgementRate}%`} helper={`${acknowledgedPings}/${pings.length} late pings acknowledged`} tone={pingAcknowledgementRate >= 80 ? "green" : pings.length ? "amber" : "grey"} />
        <MetricCard label="Courses" value={courses.length} helper="Course records in scope" tone="grey" />
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title={isDepartmentScope ? "Attendance by lecturer" : isSuperAdmin ? "Attendance by faculty" : "Attendance by department"} note="Higher bars indicate stronger reported attendance.">
          <SimpleBarChart data={attendanceChart} dataKey="attendance" color="var(--primary)" />
        </ChartPanel>
        <ChartPanel title="Flag type distribution" note="Flag volume shows the dominant quality issues.">
          <SimpleBarChart data={flagChart} dataKey="count" color="var(--chart-2)" />
        </ChartPanel>
        <ChartPanel title="Coverage status" note="Behind courses should be reviewed first.">
          <SimpleBarChart data={coverageChart} dataKey="count" color="var(--chart-5)" />
        </ChartPanel>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <ListPanel title="Top flagged lecturers">
          {topFlaggedLecturers.length ? topFlaggedLecturers.map((item) => <Row key={item.name} label={item.name} value={`${item.count} flags`} />) : <Empty />}
        </ListPanel>
        <ListPanel title="Courses behind coverage">
          {behindCourses.length ? behindCourses.map((item) => <Row key={item.course.id} label={`${item.course.code} ${item.course.title}`} value={`${item.coveragePercent}%`} href={`/courses/${item.course.id}`} />) : <Empty />}
        </ListPanel>
        <ListPanel title="Recent contested reports">
          {recentContests.length ? recentContests.map((contest) => <Row key={contest.id} label={`${contest.report.course.code} - ${displayText(contest.reason)}`} value={contest.status} href={`/reports/${contest.report.id}`} />) : <Empty />}
        </ListPanel>
      </section>
    </div>
  );
}

type AttendanceCourse = {
  lecturer: { firstName: string; lastName: string };
  department: { name: string; faculty: { name: string } };
  reports: Array<{ lecturerPresent: string }>;
};

function buildAttendanceChart(courses: AttendanceCourse[], isSuperAdmin: boolean, isDepartmentScope: boolean) {
  const groups = new Map<string, { reports: number; present: number }>();
  for (const course of courses) {
    const name = isDepartmentScope
      ? `${course.lecturer.firstName} ${course.lecturer.lastName}`
      : isSuperAdmin
        ? course.department.faculty.name
        : course.department.name;
    const current = groups.get(name) ?? { reports: 0, present: 0 };
    current.reports += course.reports.length;
    current.present += course.reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
    groups.set(name, current);
  }
  return Array.from(groups.entries()).map(([name, item]) => ({ name, attendance: item.reports ? Math.round((item.present / item.reports) * 100) : 0 }));
}

function groupByCount<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function ChartPanel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <SectionPanel title={title} description={note}>
      <div className="h-64 min-h-64">{children}</div>
    </SectionPanel>
  );
}

function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <SectionPanel title={title}>{children}</SectionPanel>;
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = <><span className="truncate text-sm font-medium">{label}</span><span className="shrink-0 font-mono text-sm text-muted">{value}</span></>;
  if (href) return <Link href={href} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:border-accent hover:bg-accent/10">{content}</Link>;
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">{content}</div>;
}

function Empty() {
  return <p className="text-sm text-muted">No records in this category.</p>;
}
