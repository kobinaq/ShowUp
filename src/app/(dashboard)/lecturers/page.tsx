import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { LecturerDirectory, type LecturerDirectoryItem } from "@/components/lecturers/LecturerDirectory";

export default async function LecturersPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const lecturers = await prisma.lecturer.findMany({
    where: isSuperAdmin
      ? {}
      : isDepartmentScope
        ? { departmentId: profile?.departmentId ?? "__none__" }
        : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } },
    include: { department: true, courses: true, flags: true },
    orderBy: { lastName: "asc" }
  });
  const directoryItems: LecturerDirectoryItem[] = lecturers.map((lecturer) => ({
    id: lecturer.id,
    href: `/lecturers/${lecturer.id}`,
    name: `${lecturer.firstName} ${lecturer.lastName}`,
    department: lecturer.department.name,
    email: lecturer.email,
    courseCount: lecturer.courses.length,
    flagCount: lecturer.flags.length,
    courses: lecturer.courses.map((course) => ({ id: course.id, code: course.code, title: course.title }))
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Lecturers" eyebrow="People records" description="Monitor teaching performance, flags, pings, and report history for lecturers in your scope." />
      <SectionPanel title="Lecturer directory" description={`${lecturers.length} lecturers currently visible.`}>
        <LecturerDirectory lecturers={directoryItems} />
      </SectionPanel>
    </div>
  );
}
