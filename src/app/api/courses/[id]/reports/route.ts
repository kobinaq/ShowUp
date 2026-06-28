import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const { id } = await params;
  const reports = await prisma.lectureReport.findMany({
    where: { courseId: id },
    include: { course: true, schedule: true, flags: true, contest: true },
    orderBy: { lectureDate: "desc" }
  });
  return json({ data: reports });
});
