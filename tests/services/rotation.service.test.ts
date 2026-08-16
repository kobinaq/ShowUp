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
  const roster = [
    { id: "ada", createdAt: new Date("2026-01-01"), realEmail: "ada@school.edu" },
    { id: "ben", createdAt: new Date("2026-01-15"), realEmail: "ben@school.edu" }
  ];

  it("cycles to the next roster person", () => {
    expect(nextSealedPerson(roster, "ada")?.realEmail).toBe("ben@school.edu");
  });

  it("returns the only person when the roster has one row", () => {
    expect(nextSealedPerson(roster.slice(0, 1), "ada")?.id).toBe("ada");
  });

  it("does not invent a roster email", () => {
    const next = nextSealedPerson(roster, "ada");
    expect(roster.map((person) => person.realEmail)).toContain(next?.realEmail);
  });
});
