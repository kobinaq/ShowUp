import Link from "next/link";
import { Role } from "@prisma/client";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel } from "@/components/shared/Panels";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportTable } from "@/components/reports/ReportTable";
import { DashboardPeriodSelect } from "@/components/dashboard/DashboardPeriodSelect";
import { displayText } from "@/lib/utils/displayText";

type DashboardPeriod = "week" | "month" | "semester" | "year";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const params = await searchParams;
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: { role: true, universityId: true, departmentId: true, university: { select: { name: true } }, department: { select: { name: true } } }
      })
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
  const courseScope = isSuperAdmin
    ? {}
    : isDepartmentScope
      ? { departmentId: profile?.departmentId ?? "__none__" }
      : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } };

  const requestedPeriod = params?.period;
  const period: DashboardPeriod = requestedPeriod === "month" || requestedPeriod === "semester" || requestedPeriod === "year" ? requestedPeriod : "week";
  const activeSemester = await prisma.semester.findFirst({
    where: isSuperAdmin ? { isActive: true } : { isActive: true, universityId: profile?.universityId ?? "__none__" },
    orderBy: { startDate: "desc" }
  });
  const periodRange = getPeriodRange(period, activeSemester);
  const periodReportScope = { ...reportScope, lectureDate: { gte: periodRange.start, lte: periodRange.end } };
  const periodLabel = periodRange.label;
  const [reports, insightReports, reportsThisWeek, absences, lateness, flags, contests, pings, courses] = await Promise.all([
    prisma.lectureReport.findMany({
      where: periodReportScope,
      take: 8,
      orderBy: { lectureDate: "desc" },
      include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true }
    }),
    prisma.lectureReport.findMany({
      where: periodReportScope,
      take: 200,
      orderBy: [{ lectureDate: "desc" }, { submittedAt: "desc" }],
      include: { course: { include: { lecturer: true, department: true } }, flags: true }
    }),
    prisma.lectureReport.count({ where: periodReportScope }),
    prisma.lectureReport.count({ where: { ...periodReportScope, lecturerPresent: "ABSENT" } }),
    prisma.lectureReport.count({ where: { ...periodReportScope, arrivalStatus: "LATE" } }),
    prisma.flag.findMany({ where: { isResolved: false, createdAt: { gte: periodRange.start, lte: periodRange.end }, ...lecturerScope }, include: { lecturer: true, report: { include: { course: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.contest.findMany({ where: { status: "PENDING", raisedAt: { gte: periodRange.start, lte: periodRange.end }, report: reportScope }, include: { report: { include: { course: true } } }, orderBy: { raisedAt: "desc" }, take: 6 }),
    prisma.latePing.findMany({ where: { lectureDate: { gte: periodRange.start, lte: periodRange.end }, course: courseScope }, include: { course: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.course.count({ where: courseScope })
  ]);
  const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const attendanceRate = reports.length ? Math.round((present / reports.length) * 100) : 0;
  const scopeName = isSuperAdmin ? "All universities" : isDepartmentScope ? profile?.department?.name ?? "Your department" : profile?.university?.name ?? "Your university";
  const insights = buildInsights(insightReports, flags, contests, periodRange.start, scopeName, periodLabel);
  const needsAttention = [
    ...flags.map((flag) => ({
      id: `flag-${flag.id}`,
      title: `${flag.lecturer.firstName} ${flag.lecturer.lastName}`,
      detail: `${flag.report?.course.code ?? "Course"} - ${flag.message}`,
      tone: "amber" as const,
      href: "/flags",
      label: "Flag"
    })),
    ...contests.map((contest) => ({
      id: `contest-${contest.id}`,
      title: contest.report.course.code,
      detail: contest.reason,
      tone: "red" as const,
      href: `/reports/${contest.reportId}`,
      label: "Contest"
    }))
  ].slice(0, 8);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scopeName}
        title="Command Center"
        description="A role-scoped view of lecturer attendance, report quality, flags, contests, and late alerts that need attention."
      />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-card p-2 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Dashboard sections">
          {[
            ["Overview", "#overview"],
            ["Needs attention", "#attention"],
            ["Latest reports", "#latest-reports"]
          ].map(([label, href], index) => (
            <a
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${index === 0 ? "bg-primary text-primary-foreground" : "text-muted hover:bg-accent hover:text-navy"}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardPeriodSelect value={period} />
          <Link href="/analytics" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-navy transition hover:border-primary">
            Open analytics <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
      <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance rate" value={`${attendanceRate}%`} badge={`${attendanceRate}%`} footerTitle={attendanceRate >= 85 ? `Attendance is healthy ${periodLabel}` : `Attendance needs review ${periodLabel}`} helper={`Based on ${reports.length} reports ${periodLabel}`} tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} trend={attendanceRate >= 85 ? "up" : "down"} href="/reports" />
        <MetricCard label={`Reports ${periodLabel}`} value={reportsThisWeek} badge={periodRange.shortLabel} footerTitle="Reporting activity" helper={`${courses} courses in scope`} tone="blue" trend="up" href="/reports" />
        <MetricCard label="Absences" value={absences} badge={absences ? "Review" : "Clear"} footerTitle={absences ? `Absence reports ${periodLabel}` : `No absence pressure ${periodLabel}`} helper={`Absence reports ${periodLabel}`} tone={absences ? "red" : "green"} trend={absences ? "down" : "up"} href="/reports" />
        <MetricCard label="Lateness" value={lateness} badge={lateness ? "Watch" : "Clear"} footerTitle={lateness ? `Late arrivals ${periodLabel}` : `No lateness pressure ${periodLabel}`} helper={`Reports marked late ${periodLabel}`} tone={lateness ? "amber" : "green"} trend={lateness ? "down" : "up"} href="/reports" />
        <MetricCard label="Open flags" value={flags.length} badge={flags.length ? "Open" : "Clear"} footerTitle={flags.length ? `Quality flags ${periodLabel}` : `No unresolved flags ${periodLabel}`} helper={`Unresolved flags raised ${periodLabel}`} tone={flags.length ? "amber" : "green"} trend={flags.length ? "down" : "up"} href="/flags" />
        <MetricCard label="Pending contests" value={contests.length} badge={contests.length ? "Pending" : "Clear"} footerTitle={contests.length ? `Contest decisions ${periodLabel}` : `No pending contests ${periodLabel}`} helper={`Awaiting QA decision ${periodLabel}`} tone={contests.length ? "red" : "green"} trend={contests.length ? "down" : "up"} href="/contests" />
        <MetricCard label="Late pings" value={pings.length} badge={null} footerTitle={pings.length ? `Lecturer alerts ${periodLabel}` : `No late alerts ${periodLabel}`} helper={`Alerts recorded ${periodLabel}`} tone={pings.length ? "amber" : "green"} trend={pings.length ? "down" : "up"} href="/analytics" />
        <MetricCard label="Courses" value={courses} badge={null} footerTitle="Active course records" helper="Active records in scope" tone="grey" trend="neutral" href="/courses" />
      </section>
      <section id="attention" className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <SectionPanel title="Needs attention" description={`Highest-signal items from flags and contests ${periodLabel}.`}>
          {needsAttention.length ? (
            <div className="space-y-3">
              {needsAttention.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3 hover:border-accent hover:bg-accent/10">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-navy">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{item.detail}</p>
                    </div>
                  </div>
                  <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title={`No urgent items in ${scopeName}.`} description="Flags, contests, and repeated issues will appear here when they need review." />
          )}
        </SectionPanel>
        <SectionPanel
          title="Workspace insight"
          description={`A deterministic summary from scoped data ${periodLabel}, without calling ShowUp AI.`}
          action={<Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-navy">Open analytics <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
        >
          <div className="space-y-3">
            {insights.length ? insights.map((insight) => (
              <div key={insight} className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                <p className="text-sm leading-6 text-slate-700">{insight}</p>
              </div>
            )) : (
              <div className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                <p className="text-sm leading-6 text-slate-700">No reports are available yet for {scopeName}. Once class reps submit reports, attendance and risk signals will appear here.</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {pings.length ? pings.slice(0, 3).map((ping) => (
              <div key={ping.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span><span className="font-mono">{ping.course.code}</span> late alert</span>
                <span className="text-muted">{ping.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )) : <p className="text-sm text-muted">No late pings recorded in this scope.</p>}
          </div>
        </SectionPanel>
      </section>
      <SectionPanel id="latest-reports" title="Latest reports" description={`Recent submissions from class reps and staff ${periodLabel}.`}>
        <ReportTable reports={reports} exportHref="/api/export/reports" />
      </SectionPanel>
    </div>
  );
}

type InsightReport = {
  lecturerPresent: string;
  arrivalStatus: string | null;
  lectureDate: Date;
  course: {
    code: string;
    lecturer: { firstName: string; lastName: string };
    department: { name: string };
  };
};

type InsightFlag = {
  type: string;
  message: string;
  lecturer: { firstName: string; lastName: string };
  report: { course: { code: string } } | null;
};

type InsightContest = {
  reason: string;
  report: { course: { code: string } };
};

function buildInsights(reports: InsightReport[], flags: InsightFlag[], contests: InsightContest[], periodStart: Date, scopeName: string, periodLabel: string) {
  if (!reports.length) return [];
  const insights: string[] = [];
  const weeklyLateByDepartment = new Map<string, number>();
  for (const report of reports) {
    if (report.lectureDate >= periodStart && report.arrivalStatus === "LATE") {
      weeklyLateByDepartment.set(report.course.department.name, (weeklyLateByDepartment.get(report.course.department.name) ?? 0) + 1);
    }
  }
  const topDepartment = Array.from(weeklyLateByDepartment.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topDepartment) insights.push(`${topDepartment[0]} has the highest lateness ${periodLabel} with ${topDepartment[1]} late report${topDepartment[1] === 1 ? "" : "s"}.`);

  const absenceStreak = longestAbsenceStreak(reports);
  if (absenceStreak.count > 1) insights.push(`${absenceStreak.lecturer} has missed ${absenceStreak.count} straight reported class sessions.`);

  const coverageFlag = flags.find((flag) => flag.type === "COVERAGE_LAG");
  if (coverageFlag?.report) insights.push(`${coverageFlag.report.course.code} is currently the strongest coverage risk: ${displayText(coverageFlag.message)}`);

  const topRisk = contests[0]
    ? `${contests[0].report.course.code} has a pending contest that needs review.`
    : flags[0]
      ? `${flags[0].lecturer.firstName} ${flags[0].lecturer.lastName} has an unresolved ${displayText(flags[0].type).toLowerCase()} flag.`
      : null;
  if (topRisk) insights.push(topRisk);

  return insights.length ? insights.slice(0, 4) : [`${scopeName} has reports available, but no standout risk pattern is visible yet.`];
}

function getPeriodRange(period: DashboardPeriod, activeSemester: { startDate: Date; endDate: Date; name: string } | null) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "this month", shortLabel: "Month" };
  }

  if (period === "semester") {
    if (activeSemester) {
      return {
        start: activeSemester.startDate,
        end: activeSemester.endDate,
        label: activeSemester.name ? `in ${activeSemester.name}` : "this semester",
        shortLabel: "Semester"
      };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "this semester", shortLabel: "Semester" };
  }

  if (period === "year") {
    const academicYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(academicYearStart, 7, 1);
    const academicEnd = new Date(academicYearStart + 1, 6, 31, 23, 59, 59, 999);
    return { start, end: academicEnd, label: "this academic year", shortLabel: "Academic year" };
  }

  const start = new Date(now);
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: "this week", shortLabel: "Week" };
}

function longestAbsenceStreak(reports: InsightReport[]) {
  const groups = new Map<string, InsightReport[]>();
  for (const report of reports) {
    const name = `${report.course.lecturer.firstName} ${report.course.lecturer.lastName}`;
    groups.set(name, [...(groups.get(name) ?? []), report]);
  }
  let best = { lecturer: "", count: 0 };
  for (const [lecturer, items] of groups.entries()) {
    const sorted = items.sort((a, b) => b.lectureDate.getTime() - a.lectureDate.getTime());
    let count = 0;
    for (const item of sorted) {
      if (item.lecturerPresent !== "ABSENT") break;
      count += 1;
    }
    if (count > best.count) best = { lecturer, count };
  }
  return best;
}
