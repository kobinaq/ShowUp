import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/EmptyState";
import { createClient } from "@/lib/supabase/server";

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
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Courses</h1>
        <Link href="/admin" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-navy">Manage setup</Link>
      </div>
      {courses.length === 0 ? <EmptyState title="No courses have been created yet." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="rounded-card bg-white p-5 shadow-card hover:ring-2 hover:ring-accent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-muted">{course.code}</p>
                  <h2 className="font-display text-xl font-bold">{course.title}</h2>
                  <p className="mt-2 text-sm text-muted">{course.department.name} - {course.lecturer.firstName} {course.lecturer.lastName}</p>
                </div>
                <p className="font-mono text-sm">{course.outline?.topics.length ?? 0} topics</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
