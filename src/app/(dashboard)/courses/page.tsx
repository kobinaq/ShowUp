import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { courseScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { CourseDirectory, type CourseDirectoryItem } from "@/components/courses/CourseDirectory";

export default async function CoursesPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const canManageSetup = profile.role === Role.SUPER_ADMIN || profile.role === Role.IT;
  const courses = await prisma.course.findMany({
    where: courseScope(profile),
    include: { lecturer: true, department: true, schedule: true, outline: { include: { topics: true } } },
    orderBy: { code: "asc" }
  });
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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        eyebrow="Academic records"
        description="Review course schedules, lecturers, outline coverage, and report history."
        actions={canManageSetup ? <Link href="/admin" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-navy">Manage setup</Link> : null}
      />
      <SectionPanel title="Course catalog" description={`${courses.length} courses in your current scope.`}>
        <CourseDirectory courses={directoryItems} />
      </SectionPanel>
    </div>
  );
}
