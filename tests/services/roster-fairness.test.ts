import { rosterFairness } from "@/lib/services/roster-fairness";

describe("rosterFairness", () => {
  it("counts cycles per person and flags concentration", () => {
    const assignments = [
      { sealedIdentityId: "ada", createdAt: new Date("2026-08-01") },
      { sealedIdentityId: "ada", createdAt: new Date("2026-08-08") },
      { sealedIdentityId: "ada", createdAt: new Date("2026-08-15") },
      { sealedIdentityId: "ben", createdAt: new Date("2026-07-20") }
    ];
    const summary = rosterFairness(assignments);
    expect(summary.totalCycles).toBe(4);
    expect(summary.byPerson).toEqual(
      expect.arrayContaining([
        { sealedIdentityId: "ada", cycles: 3 },
        { sealedIdentityId: "ben", cycles: 1 }
      ])
    );
    expect(summary.concentrated).toBe(true);
  });

  it("does not warn on a short history", () => {
    expect(
      rosterFairness([
        { sealedIdentityId: "ada", createdAt: new Date("2026-08-01") },
        { sealedIdentityId: "ben", createdAt: new Date("2026-08-08") }
      ]).concentrated
    ).toBe(false);
  });
});
