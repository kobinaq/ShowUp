import { RosterProposalStatus } from "@prisma/client";
import { canReviewRosterProposal, rosterIdentityFromProposal } from "@/lib/services/roster-proposal";

describe("roster proposals", () => {
  it("allows review only while pending", () => {
    expect(canReviewRosterProposal(RosterProposalStatus.PENDING)).toBe(true);
    expect(canReviewRosterProposal(RosterProposalStatus.APPROVED)).toBe(false);
  });

  it("maps a proposal onto a roster person", () => {
    expect(
      rosterIdentityFromProposal({
        courseId: "course-1",
        realName: "Ada",
        realEmail: "ada@school.edu",
        realPhone: "+233555000000"
      })
    ).toEqual({
      courseId: "course-1",
      realName: "Ada",
      realEmail: "ada@school.edu",
      realPhone: "+233555000000"
    });
  });
});
