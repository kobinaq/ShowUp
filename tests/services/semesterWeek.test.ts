import { getSemesterWeek } from "@/lib/utils/semesterWeek";

describe("getSemesterWeek", () => {
  it("returns zero before the semester starts", () => {
    expect(getSemesterWeek(new Date("2026-09-01"), new Date("2026-08-01"))).toBe(0);
  });

  it("returns one during the first week", () => {
    expect(getSemesterWeek(new Date("2026-09-01"), new Date("2026-09-02"))).toBe(1);
  });
});
