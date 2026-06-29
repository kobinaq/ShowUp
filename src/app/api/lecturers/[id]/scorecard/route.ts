import { prisma } from "@/lib/prisma";
import { andWhere, lecturerScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const lecturer = await prisma.lecturer.findFirst({
    where: andWhere({ id }, lecturerScope(profile)),
    include: { courses: { include: { reports: true } }, flags: true, notifications: true }
  });
  if (!lecturer) return json({ error: "Not found" }, { status: 404 });
  const reports = lecturer.courses.flatMap((course) => course.reports);
  const held = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
  const punctual = reports.filter((report) => report.arrivalStatus !== "LATE").length;
  return json({
    data: {
      lecturer,
      attendanceRate: reports.length ? Math.round((held / reports.length) * 100) : 0,
      punctualityRate: reports.length ? Math.round((punctual / reports.length) * 100) : 0,
      totalFlags: lecturer.flags.length
    }
  });
});
