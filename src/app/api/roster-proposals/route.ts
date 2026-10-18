import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rosterProposalScope } from "@/lib/auth/scope";
import { json, withAuth } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const proposals = await prisma.rosterProposal.findMany({
    where: rosterProposalScope(profile),
    include: { course: { select: { code: true, title: true } }, proposedBy: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  return json({ data: proposals });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT]);
