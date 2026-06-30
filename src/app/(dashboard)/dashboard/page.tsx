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
  const [reports, reportsThisWeek, absences, lateness, flags, contests, pings, courses] = await Promise.all([
    prisma.lectureReport.findMany({
      where: reportScope,
      take: 8,
      orderBy: { lectureDate: "desc" },
      include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true }
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
  const scopeName = isSuperAdmin ? "All universities" : isDepartmentScope ? profile?.department?.name ?? "Your department" : profile?.university?.name ?? "Your university";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scopeName}
        title="Command Center"
        description="A role-scoped view of lecturer attendance, report quality, flags, contests, and late alerts that need attention."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance rate" value={`${attendanceRate}%`} helper="Based on latest scoped reports" tone={attendanceRate >= 85 ? "green" : attendanceRate >= 70 ? "amber" : "red"} />
        <MetricCard label="Reports this week" value={reportsThisWeek} helper={`${courses} courses in scope`} tone="blue" />
        <MetricCard label="Absences" value={absences} helper="All recorded absence reports" tone={absences ? "red" : "green"} />
        <MetricCard label="Lateness" value={lateness} helper="Reports marked late" tone={lateness ? "amber" : "green"} />
        <MetricCard label="Open flags" value={flags.length} helper="Unresolved quality flags" tone={flags.length ? "amber" : "green"} />
        <MetricCard label="Pending contests" value={contests.length} helper="Awaiting QA decision" tone={contests.length ? "red" : "green"} />
        <MetricCard label="Late pings" value={pings.length} helper="Most recent alerts in scope" tone={pings.length ? "amber" : "green"} />
        <MetricCard label="Courses" value={courses} helper="Active records in scope" tone="grey" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
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
          <div className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            <p className="text-sm leading-6 text-slate-700">
              {reports.length
                ? `${scopeName} has ${reportsThisWeek} reports this week, ${flags.length} open flags, and ${contests.length} pending contests. Attendance is currently ${attendanceRate}% across the latest reports.`
                : `No reports are available yet for ${scopeName}. Once class reps submit reports, attendance and risk signals will appear here.`}
            </p>
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
      <SectionPanel title="Latest reports" description="Recent submissions from class reps and staff within your scope.">
        <ReportTable reports={reports} exportHref="/api/export/reports" />
      </SectionPanel>
    </div>
  );
}
