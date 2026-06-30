import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "code", label: "Code", mono: true },
  { key: "title", label: "Course" },
  { key: "department", label: "Department" },
  { key: "lecturer", label: "Lecturer" },
  { key: "schedule", label: "Schedule" },
  { key: "topics", label: "Topics" }
];

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const courses = await prisma.course.findMany({
    where: isSuperAdmin
      ? {}
      : isDepartmentScope
        ? { departmentId: profile?.departmentId ?? "__none__" }
        : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } },
    include: { lecturer: true, department: true, schedule: true, outline: { include: { topics: true } } },
    orderBy: { code: "asc" }
  });
  const rows: DataTableRow[] = courses.map((course) => ({
    id: course.id,
    href: `/courses/${course.id}`,
    searchText: `${course.code} ${course.title} ${course.department.name} ${course.lecturer.firstName} ${course.lecturer.lastName}`,
    filters: [course.department.name],
    cells: {
      code: course.code,
      title: course.title,
      department: course.department.name,
      lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
      schedule: course.schedule.map((item) => `${item.startTime}-${item.endTime}`).join(", ") || "-",
      topics: course.outline?.topics.length ?? 0
    }
  }));
  const departments = Array.from(new Set(courses.map((course) => course.department.name))).map((name) => ({ label: name, value: name }));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        eyebrow="Academic records"
        description="Review course schedules, lecturers, outline coverage, and report history."
        actions={<Link href="/admin" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-navy">Manage setup</Link>}
      />
      <SectionPanel title="Course catalog" description={`${courses.length} courses in your current scope.`}>
        <DataTable columns={columns} rows={rows} filters={departments} searchPlaceholder="Search courses, lecturers, departments..." emptyTitle="No courses match this view." />
      </SectionPanel>
    </div>
  );
}
