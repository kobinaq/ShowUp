import { daysOverdue, latestRotationFailure } from "@/lib/services/rotation-health";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

describe("rotation health", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("counts days past the due date", () => {
    expect(
      daysOverdue(
        { endDate: new Date("2026-08-14T12:00:00.000Z"), startDate: new Date("2026-07-01T12:00:00.000Z"), rotationWeeks: 4 },
        now
      )
    ).toBe(2);
  });

  it("is zero when the assignment is still current", () => {
    expect(
      daysOverdue({ endDate: null, startDate: new Date(now.getTime() - WEEK_MS), rotationWeeks: 4 }, now)
    ).toBe(0);
  });

  it("returns the newest failed rotation error", () => {
    expect(
      latestRotationFailure([
        { action: "rotated", error: null, createdAt: new Date("2026-08-10") },
        { action: "failed", error: "old", createdAt: new Date("2026-08-12") },
        { action: "failed", error: "No sealed identities available for this course", createdAt: new Date("2026-08-15") }
      ])
    ).toBe("No sealed identities available for this course");
  });
});
