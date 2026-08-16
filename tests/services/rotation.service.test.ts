import { assignmentIsDue, nextSealedPerson } from "@/lib/services/rotation.service";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

describe("assignmentIsDue", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("is due when endDate has passed", () => {
    expect(
      assignmentIsDue(
        { endDate: new Date("2026-08-15T12:00:00.000Z"), startDate: new Date("2026-07-01T12:00:00.000Z"), rotationWeeks: 8 },
        now
      )
    ).toBe(true);
  });

  it("uses rotationWeeks instead of a hardcoded 4-week cycle", () => {
    const start = new Date(now.getTime() - 5 * WEEK_MS);
    expect(assignmentIsDue({ endDate: null, startDate: start, rotationWeeks: 8 }, now)).toBe(false);
    expect(assignmentIsDue({ endDate: null, startDate: start, rotationWeeks: 4 }, now)).toBe(true);
  });
});

describe("nextSealedPerson", () => {
  const pool = [
    { anonymousAlias: "old-a", realEmail: "ada@school.edu", createdAt: new Date("2026-01-01") },
    { anonymousAlias: "clone-a", realEmail: "ada@school.edu", createdAt: new Date("2026-02-01") },
    { anonymousAlias: "old-b", realEmail: "ben@school.edu", createdAt: new Date("2026-01-15") }
  ];

  it("cycles to the next distinct person, not the first ledger row", () => {
    const next = nextSealedPerson(pool, "old-a");
    expect(next?.realEmail).toBe("ben@school.edu");
  });

  it("returns the only person when the roster has one email", () => {
    const next = nextSealedPerson(pool.slice(0, 2), "old-a");
    expect(next?.realEmail).toBe("ada@school.edu");
  });
});
