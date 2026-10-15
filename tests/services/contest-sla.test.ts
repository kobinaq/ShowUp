import { ContestStatus } from "@prisma/client";
import { contestDeadline, isContestOverdue } from "@/lib/services/contest-sla";

describe("contest SLA", () => {
  const raisedAt = new Date("2026-08-10T12:00:00.000Z");

  it("computes the deadline from SLA days", () => {
    expect(contestDeadline(raisedAt, 5)).toEqual(new Date("2026-08-15T12:00:00.000Z"));
  });

  it("marks a pending contest overdue after the deadline", () => {
    expect(
      isContestOverdue({
        status: ContestStatus.PENDING,
        raisedAt,
        slaDays: 5,
        now: new Date("2026-08-16T12:00:00.000Z")
      })
    ).toBe(true);
    expect(
      isContestOverdue({
        status: ContestStatus.ACCEPTED,
        raisedAt,
        slaDays: 5,
        now: new Date("2026-08-16T12:00:00.000Z")
      })
    ).toBe(false);
  });
});
