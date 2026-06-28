import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { contestSchema } from "@/lib/validators/contest";

export const GET = withAuth(async () => {
  const contests = await prisma.contest.findMany({
    include: { report: { include: { course: true } }, raisedBy: true, resolvedBy: true },
    orderBy: { raisedAt: "desc" }
  });
  return json({ data: contests });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.HOD, Role.HOD_ASSISTANT]);

export const POST = withAuth(async (request, { profile }) => {
  const parsed = contestSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid contest payload", parsed.error.flatten());
  const contest = await prisma.$transaction(async (tx) => {
    const saved = await tx.contest.create({ data: { ...parsed.data, raisedById: profile.id } });
    await tx.lectureReport.update({ where: { id: parsed.data.reportId }, data: { isContested: true } });
    return saved;
  });
  return json({ data: contest }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
