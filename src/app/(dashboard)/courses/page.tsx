import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { contestScope, courseScope, flagScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { CourseDirectory, type CourseDirectoryItem } from "@/components/courses/CourseDirectory";
import { NeedsAttentionList } from "@/components/home/NeedsAttentionList";
import { EmptyState } from "@/components/shared/EmptyState";
import { buildStaffAttention } from "@/lib/services/role-attention";

export default async function CoursesPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const canManageSetup = profile.role === Role.SUPER_ADMIN || profile.role === Role.IT;
  const isHod = profile.role === Role.HOD || profile.role === Role.HOD_ASSISTANT;
  const [courses, unresolvedFlags, pendingContests, openDiscrepancies] = await Promise.all([
    prisma.course.findMany({
      where: courseScope(profile),
      include: { lecturer: true, department: true, schedule: true, outline: { include: { topics: true } } },
      orderBy: { code: "asc" }
    }),
    isHod ? prisma.flag.count({ where: { ...flagScope(profile), isResolved: false } }) : Promise.resolve(0),
    isHod ? prisma.contest.count({ where: { ...contestScope(profile), status: "PENDING" } }) : Promise.resolve(0),
    isHod ? prisma.reportDiscrepancy.count({ where: { course: courseScope(profile), status: "OPEN" } }) : Promise.resolve(0)
  ]);
  const directoryItems: CourseDirectoryItem[] = courses.map((course) => ({
    id: course.id,
    href: `/courses/${course.id}`,
    code: course.code,
    title: course.title,
    department: course.department.name,
    lecturer: { id: course.lecturer.id, name: `${course.lecturer.firstName} ${course.lecturer.lastName}` },
    schedule: course.schedule.map((item) => `${item.startTime}-${item.endTime}`).join(", ") || "No schedule",
    classSize: course.classSize,
    topicCount: course.outline?.topics.length ?? 0
  }));
  const hodAttention = buildStaffAttention({
    unresolvedFlags,
    pendingContests,
    openDiscrepancies,
    noDataSessions: 0,
    repFlags: 0
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        eyebrow="Academic records"
        description="Review course schedules, lecturers, outline coverage, and report history."
        actions={canManageSetup ? <Link href="/admin" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-navy">Manage setup</Link> : null}
      />
      {isHod ? (
        <SectionPanel title="Needs attention today" description="Department contests, flags, and discrepancies.">
          <NeedsAttentionList items={hodAttention} emptyTitle="Department is clear." emptyDescription="New contests and flags for your department will appear here." />
        </SectionPanel>
      ) : null}
      <SectionPanel title="Course catalog" description={`${courses.length} courses in your current scope.`}>
        {directoryItems.length ? (
          <CourseDirectory courses={directoryItems} />
        ) : (
          <EmptyState title="No courses in scope." description="IT can add courses in the admin setup wizard." />
        )}
      </SectionPanel>
    </div>
  );
}
