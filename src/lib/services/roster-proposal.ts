import { RosterProposalStatus } from "@prisma/client";

export function canReviewRosterProposal(status: RosterProposalStatus) {
  return status === RosterProposalStatus.PENDING;
}

export function rosterIdentityFromProposal(proposal: { realName: string; realEmail: string; realPhone: string; courseId: string }) {
  return {
    realName: proposal.realName,
    realEmail: proposal.realEmail,
    realPhone: proposal.realPhone,
    courseId: proposal.courseId
  };
}
