import { coverageService } from "@/lib/services/coverage.service";
import { withAuth, json } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";

type Params = { params: Promise<{ courseId: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { courseId } = await params;
  const course = await prisma.course.findFirst({ where: andWhere({ id: courseId }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  return json({ data: await coverageService.calculate(courseId) });
});
