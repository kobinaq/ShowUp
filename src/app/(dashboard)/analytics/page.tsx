import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { createClient } from "@/lib/supabase/server";
import { coverageService } from "@/lib/services/coverage.service";
import { displayText } from "@/lib/utils/displayText";

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
      outline: { include: { topics: true } }
    },
    orderBy: { code: "asc" }
  });

  const reports = courses.flatMap((course) => course.reports.map((report) => ({ ...report, course })));
  const flags = reports.flatMap((report) => report.flags.map((flag) => ({ ...flag, report })));
  const contests = reports.flatMap((report) => report.contest ? [{ ...report.contest, report }] : []);
  const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const absences = reports.filter((report) => report.lecturerPresent === "ABSENT").length;
  const lateness = reports.filter((report) => report.arrivalStatus === "LATE").length;
  const unresolvedFlags = flags.filter((flag) => !flag.isResolved).length;
  const openContests = contests.filter((contest) => contest.status === "PENDING").length;

  const coverage = await Promise.all(courses.map(async (course) => ({ course, ...(await coverageService.calculate(course.id)) })));
  const averageCoverage = coverage.length ? Math.round(coverage.reduce((sum, item) => sum + item.coveragePercent, 0) / coverage.length) : 0;
  const attendanceRate = reports.length ? Math.round((present / reports.length) * 100) : 0;
  const attendanceChart = buildAttendanceChart(courses, isSuperAdmin, isDepartmentScope);
  const flagChart = Object.entries(groupByCount(flags, (flag) => flag.type)).map(([name, count]) => ({ name, count }));
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
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{scopeTitle}</p>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
      </header>
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Attendance rate" value={`${attendanceRate}%`} />
        <Metric label="Reports" value={reports.length.toString()} />
        <Metric label="Absences" value={absences.toString()} />
        <Metric label="Lateness" value={lateness.toString()} />
        <Metric label="Open flags" value={unresolvedFlags.toString()} />
        <Metric label="Open contests" value={openContests.toString()} />
        <Metric label="Average coverage" value={`${averageCoverage}%`} />
        <Metric label="Courses" value={courses.length.toString()} />
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title={isDepartmentScope ? "Attendance by lecturer" : isSuperAdmin ? "Attendance by faculty" : "Attendance by department"}>
          <SimpleBarChart data={attendanceChart} dataKey="attendance" />
        </ChartPanel>
        <ChartPanel title="Flag type distribution">
          <SimpleBarChart data={flagChart} dataKey="count" color="#F59E0B" />
        </ChartPanel>
        <ChartPanel title="Coverage status">
          <SimpleBarChart data={coverageChart} dataKey="count" color="#2563EB" />
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

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="h-80 rounded-card bg-white p-5 shadow-card"><h2 className="font-display text-xl font-bold">{title}</h2>{children}</section>;
}

function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-card bg-white p-5 shadow-card"><h2 className="font-display text-xl font-bold">{title}</h2><div className="mt-4 space-y-3">{children}</div></section>;
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = <><span className="truncate text-sm font-medium">{label}</span><span className="shrink-0 font-mono text-sm text-muted">{value}</span></>;
  if (href) return <Link href={href} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:border-accent hover:bg-accent/10">{content}</Link>;
  return <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">{content}</div>;
}

function Empty() {
  return <p className="text-sm text-muted">No records found.</p>;
}
