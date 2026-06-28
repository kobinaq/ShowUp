import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const departmentId = profile.role === "HOD" || profile.role === "HOD_ASSISTANT" ? profile.departmentId : undefined;
  const faculties = await prisma.faculty.findMany({
    include: {
      departments: {
        where: departmentId ? { id: departmentId } : {},
        include: { courses: { include: { reports: true } } }
      }
    }
  });
  const data = faculties.filter((faculty) => faculty.departments.length > 0).map((faculty) => {
    const reports = faculty.departments.flatMap((department) => department.courses.flatMap((course) => course.reports));
    const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
    return { facultyId: faculty.id, name: faculty.name, attendanceRate: reports.length ? Math.round((present / reports.length) * 100) : 0 };
  });
  return json({ data });
});
