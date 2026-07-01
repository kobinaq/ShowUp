import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { courseScope } from "@/lib/auth/scope";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel } from "@/components/shared/Panels";
import { StudentReporterManager, type StudentCourse } from "@/components/students/StudentReporterManager";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: { id: true, role: true, universityId: true, departmentId: true }
      })
    : null;

  const scopedProfile = profile ?? { id: "__none__", role: Role.CLASS_REP, universityId: "__none__", departmentId: null };
  const courses = await prisma.course.findMany({
    where: courseScope(scopedProfile),
    include: {
      lecturer: true,
      department: true,
      schedule: true,
      repAssignments: {
        include: { profile: true },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
      }
    },
    orderBy: { code: "asc" }
  });
  const courseIds = courses.map((course) => course.id);
  const comparisonReports = courseIds.length
    ? await prisma.lectureReport.findMany({
        where: { isVoided: false, courseId: { in: courseIds } },
        select: {
          id: true,
          courseId: true,
          scheduleId: true,
          lectureDate: true,
          lecturerPresent: true,
          arrivalStatus: true,
          lateMinutes: true,
          studentCount: true,
          additionalNotes: true,
          schedule: { select: { startTime: true, endTime: true } },
          submittedBy: { select: { anonymousAlias: true } },
          topicsCovered: { select: { topic: { select: { title: true } } } }
        },
        orderBy: [{ lectureDate: "desc" }, { submittedAt: "desc" }],
        take: 300
      })
    : [];
  const comparisonReportsByCourse = new Map<string, typeof comparisonReports>();
  comparisonReports.forEach((report) => {
    comparisonReportsByCourse.set(report.courseId, [...(comparisonReportsByCourse.get(report.courseId) ?? []), report]);
  });

  const aliases = courses.flatMap((course) => course.repAssignments.map((assignment) => assignment.profile.anonymousAlias).filter(Boolean) as string[]);
  const identities = aliases.length
    ? await prisma.sealedRepIdentity.findMany({ where: { anonymousAlias: { in: aliases } } })
    : [];
  const identityByAlias = new Map(identities.map((identity) => [identity.anonymousAlias, identity]));

  const studentCourses: StudentCourse[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    department: course.department.name,
    lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
    reporters: course.repAssignments.map((assignment) => {
      const alias = assignment.profile.anonymousAlias ?? "Reporter";
      const identity = identityByAlias.get(alias);
      return {
        id: assignment.id,
        alias,
        realName: identity?.realName ?? null,
        realEmail: identity?.realEmail ?? null,
        realPhone: identity?.realPhone ?? null,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt.toISOString()
      };
    }),
    comparisons: buildComparisons(comparisonReportsByCourse.get(course.id) ?? [])
  }));

  const activeSlots = studentCourses.reduce((sum, course) => sum + course.reporters.filter((reporter) => reporter.isActive).length, 0);
  const fullCourses = studentCourses.filter((course) => course.reporters.filter((reporter) => reporter.isActive).length === 2).length;
  const missingSlots = Math.max(0, studentCourses.length * 2 - activeSlots);
  const comparisonCount = studentCourses.reduce((sum, course) => sum + course.comparisons.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        eyebrow="Reporter management"
        description="Assign two student reporters per class and compare matching reports without changing contest decisions automatically."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Courses" value={studentCourses.length} helper="In your current scope" tone="blue" />
        <MetricCard label="Fully assigned" value={fullCourses} helper="Courses with 2 active reporters" tone={fullCourses === studentCourses.length ? "green" : "amber"} />
        <MetricCard label="Open slots" value={missingSlots} helper="Reporter slots still available" tone={missingSlots ? "amber" : "green"} />
        <MetricCard label="Comparisons" value={comparisonCount} helper="Recent paired reports" tone={comparisonCount ? "blue" : "grey"} />
      </section>
      <SectionPanel title="Student reporters" description="Each course supports exactly two active reporters. Deactivate a reporter before replacing that slot.">
        <StudentReporterManager courses={studentCourses} />
      </SectionPanel>
    </div>
  );
}

type ComparisonReport = {
  id: string;
  courseId: string;
  scheduleId: string;
  lectureDate: Date;
  lecturerPresent: string;
  arrivalStatus: string | null;
  lateMinutes: number | null;
  studentCount: number | null;
  additionalNotes: string | null;
  schedule: { startTime: string; endTime: string };
  submittedBy: { anonymousAlias: string | null };
  topicsCovered: Array<{ topic: { title: string } }>;
};

function buildComparisons(reports: ComparisonReport[]) {
  const grouped = new Map<string, ComparisonReport[]>();
  reports.forEach((report) => {
    const key = `${report.scheduleId}:${report.lectureDate.toISOString().slice(0, 10)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), report]);
  });

  return Array.from(grouped.values())
    .filter((items) => items.length >= 2)
    .slice(0, 4)
    .map((items) => {
      const first = items[0];
      return {
        id: `${first.scheduleId}-${first.lectureDate.toISOString()}`,
        date: first.lectureDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        session: `${first.schedule.startTime}-${first.schedule.endTime}`,
        reports: items.slice(0, 2).map((report) => ({
          reporter: report.submittedBy.anonymousAlias ?? "Reporter",
          presence: report.lecturerPresent,
          arrivalStatus: report.arrivalStatus,
          lateMinutes: report.lateMinutes,
          studentCount: report.studentCount,
          topics: report.topicsCovered.map((item) => item.topic.title),
          notes: report.additionalNotes
        }))
      };
    });
}
