import { prisma } from "@/lib/prisma";
import { andWhere, reportScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const report = await prisma.lectureReport.findFirst({
    where: andWhere({ id }, reportScope(profile)),
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
