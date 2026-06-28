import { coverageService } from "@/lib/services/coverage.service";
import { forbidden, withAuth, json } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ courseId: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { courseId } = await params;
  if (profile.role === "HOD" || profile.role === "HOD_ASSISTANT") {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { departmentId: true } });
    if (!course || course.departmentId !== profile.departmentId) {
      return forbidden("HOD analytics are limited to their own department");
    }
  }
  return json({ data: await coverageService.calculate(courseId) });
});
