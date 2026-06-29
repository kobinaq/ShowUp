import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const course = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  const reports = await prisma.lectureReport.findMany({
    where: { courseId: id },
    include: { course: true, schedule: true, flags: true, contest: true },
    orderBy: { lectureDate: "desc" }
  });
  return json({ data: reports });
});
