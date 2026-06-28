import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const report = await prisma.lectureReport.findUnique({
    where: { id: params.id },
    include: {
      course: { include: { lecturer: true, department: { include: { faculty: true } } } },
      schedule: true,
      submittedBy: { select: { anonymousAlias: true } },
      topicsCovered: { include: { topic: true } },
      teachingAids: true,
      flags: true,
      contest: true
    }
  });
  return report ? json({ data: report }) : json({ error: "Not found" }, { status: 404 });
});
