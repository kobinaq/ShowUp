import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const reports = await prisma.lectureReport.findMany({
    where: { courseId: params.id },
    include: { course: true, schedule: true, flags: true, contest: true },
    orderBy: { lectureDate: "desc" }
  });
  return json({ data: reports });
});
