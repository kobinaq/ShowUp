import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { lecturerScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { LecturerDirectory, type LecturerDirectoryItem } from "@/components/lecturers/LecturerDirectory";

export default async function LecturersPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const lecturers = await prisma.lecturer.findMany({
    where: lecturerScope(profile),
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
