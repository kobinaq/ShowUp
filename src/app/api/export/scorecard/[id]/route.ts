import { prisma } from "@/lib/prisma";
import { andWhere, lecturerScope } from "@/lib/auth/scope";
import { withAuth } from "@/lib/middleware/withAuth";
import { exportService } from "@/lib/services/export.service";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const lecturer = await prisma.lecturer.findFirst({ where: andWhere({ id }, lecturerScope(profile)), include: { flags: true, courses: true } });
  if (!lecturer) return new Response("Not found", { status: 404 });
  const pdf = exportService.scorecardPdf(`${lecturer.firstName} ${lecturer.lastName}`, [
    ["Courses", lecturer.courses.length],
    ["Flags", lecturer.flags.length]
  ]);
  return new Response(pdf, {
    headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=scorecard.pdf" }
  });
});
