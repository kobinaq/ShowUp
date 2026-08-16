import { ContestStatus } from "@prisma/client";
import { contestIsPending, reportFlagsForResolution } from "@/lib/services/contest-resolution";

describe("reportFlagsForResolution", () => {
  it("voids the report when the contest is accepted", () => {
    expect(reportFlagsForResolution(true)).toEqual({ isVoided: true, isContested: false });
  });

  it("keeps the report when the contest is dismissed", () => {
    expect(reportFlagsForResolution(false)).toEqual({ isVoided: false, isContested: false });
  });
});

describe("contestIsPending", () => {
  it("allows resolution only while PENDING", () => {
    expect(contestIsPending(ContestStatus.PENDING)).toBe(true);
    expect(contestIsPending(ContestStatus.ACCEPTED)).toBe(false);
    expect(contestIsPending(ContestStatus.DISMISSED)).toBe(false);
  });
});
