import { Role, RosterProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, rosterProposalScope } from "@/lib/auth/scope";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { canReviewRosterProposal, rosterIdentityFromProposal } from "@/lib/services/roster-proposal";
import { reviewRosterProposalSchema } from "@/lib/validators/roster-proposal";

type Params = { params: Promise<{ id: string }> };

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = reviewRosterProposalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid review payload", parsed.error.flatten());
  const existing = await prisma.rosterProposal.findFirst({
    where: andWhere({ id }, rosterProposalScope(profile))
  });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  if (!canReviewRosterProposal(existing.status)) {
    return json({ error: "Proposal is already reviewed" }, { status: 409 });
  }
  const reviewed = await prisma.$transaction(async (tx) => {
    if (parsed.data.status === RosterProposalStatus.APPROVED) {
      const identity = rosterIdentityFromProposal(existing);
      await tx.sealedRepIdentity.upsert({
        where: { courseId_realEmail: { courseId: identity.courseId, realEmail: identity.realEmail } },
        create: identity,
        update: { realName: identity.realName, realPhone: identity.realPhone }
      });
    }
    return tx.rosterProposal.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewNote: parsed.data.reviewNote,
        reviewedById: profile.id,
        reviewedAt: new Date()
      }
    });
  });
  return json({ data: reviewed });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT]);
