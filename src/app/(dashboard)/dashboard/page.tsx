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
import { displayText } from "@/lib/utils/displayText";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
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

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const [reports, insightReports, reportsThisWeek, absences, lateness, flags, contests, pings, courses] = await Promise.all([
    prisma.lectureReport.findMany({
      where: reportScope,
      take: 8,
      orderBy: { lectureDate: "desc" },
      include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true }
    }),
    prisma.lectureReport.findMany({
      where: reportScope,
      take: 200,
      orderBy: [{ lectureDate: "desc" }, { submittedAt: "desc" }],
      include: { course: { include: { lecturer: true, department: true } }, flags: true }
    }),
    prisma.lectureReport.count({ where: { ...reportScope, submittedAt: { gte: weekStart } } }),
    prisma.lectureReport.count({ where: { ...reportScope, lecturerPresent: "ABSENT" } }),
    prisma.lectureReport.count({ where: { ...reportScope, arrivalStatus: "LATE" } }),
    prisma.flag.findMany({ where: { isResolved: false, ...lecturerScope }, include: { lecturer: true, report: { include: { course: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.contest.findMany({ where: { status: "PENDING", report: reportScope }, include: { report: { include: { course: true } } }, orderBy: { raisedAt: "desc" }, take: 6 }),
    prisma.latePing.findMany({ where: { course: courseScope }, include: { course: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.course.count({ where: courseScope })
  ]);
  const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const attendanceRate = reports.length ? Math.round((present / reports.length) * 100) : 0;
  const scopeName = isSuperAdmin ? "All universities" : isDepartmentScope ? profile?.department?.name ?? "Your department" : profile?.university?.name ?? "Your university";
  const insights = buildInsights(insightReports, flags, contests, weekStart, scopeName);
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
        <Link href="/analytics" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-navy transition hover:border-primary">
          Open analytics <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance rate" value={`${attendanceRate}%`} badge={`${attendanceRate}%`} footerTitle={attendanceRate >= 85 ? "Attendance is healthy" : "Attendance needs review"} helper="Based on latest scoped reports" tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} trend={attendanceRate >= 85 ? "up" : "down"} href="/reports" />
        <MetricCard label="Reports this week" value={reportsThisWeek} badge="This week" footerTitle="Reporting activity" helper={`${courses} courses in scope`} tone="blue" trend="up" href="/reports" />
        <MetricCard label="Absences" value={absences} badge={absences ? "Review" : "Clear"} footerTitle={absences ? "Absence reports need attention" : "No absence pressure"} helper="All recorded absence reports" tone={absences ? "red" : "green"} trend={absences ? "down" : "up"} href="/reports" />
        <MetricCard label="Lateness" value={lateness} badge={lateness ? "Watch" : "Clear"} footerTitle={lateness ? "Late arrivals are present" : "No lateness pressure"} helper="Reports marked late" tone={lateness ? "amber" : "green"} trend={lateness ? "down" : "up"} href="/reports" />
        <MetricCard label="Open flags" value={flags.length} badge={flags.length ? "Open" : "Clear"} footerTitle={flags.length ? "Quality flags need review" : "No unresolved flags"} helper="Unresolved quality flags" tone={flags.length ? "amber" : "green"} trend={flags.length ? "down" : "up"} href="/flags" />
        <MetricCard label="Pending contests" value={contests.length} badge={contests.length ? "Pending" : "Clear"} footerTitle={contests.length ? "Contest decisions pending" : "No pending contests"} helper="Awaiting QA decision" tone={contests.length ? "red" : "green"} trend={contests.length ? "down" : "up"} href="/contests" />
        <MetricCard label="Late pings" value={pings.length} badge="Recent" footerTitle={pings.length ? "Recent lecturer alerts" : "No late alerts recorded"} helper="Most recent alerts in scope" tone={pings.length ? "amber" : "green"} trend={pings.length ? "down" : "up"} href="/analytics" />
        <MetricCard label="Courses" value={courses} badge="Scoped" footerTitle="Active course records" helper="Active records in scope" tone="grey" trend="neutral" href="/courses" />
      </section>
      <section id="attention" className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <SectionPanel title="Needs attention" description="Highest-signal items from flags and contests.">
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
          description="A deterministic summary from the scoped data, without calling ShowUp AI."
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
      <SectionPanel id="latest-reports" title="Latest reports" description="Recent submissions from class reps and staff within your scope.">
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

function buildInsights(reports: InsightReport[], flags: InsightFlag[], contests: InsightContest[], weekStart: Date, scopeName: string) {
  if (!reports.length) return [];
  const insights: string[] = [];
  const weeklyLateByDepartment = new Map<string, number>();
  for (const report of reports) {
    if (report.lectureDate >= weekStart && report.arrivalStatus === "LATE") {
      weeklyLateByDepartment.set(report.course.department.name, (weeklyLateByDepartment.get(report.course.department.name) ?? 0) + 1);
    }
  }
  const topDepartment = Array.from(weeklyLateByDepartment.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topDepartment) insights.push(`${topDepartment[0]} has the highest lateness this week with ${topDepartment[1]} late report${topDepartment[1] === 1 ? "" : "s"}.`);

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
