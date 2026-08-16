import { reportSchema } from "@/lib/validators/report";

const session = {
  courseId: "course123",
  scheduleId: "schedule1",
  lectureDate: "2026-08-16"
};

describe("reportSchema", () => {
  it("accepts an absent payload without interactivity or teaching aids", () => {
    expect(reportSchema.safeParse({ ...session, lecturerPresent: "ABSENT" }).success).toBe(true);
  });

  it("rejects a present payload without interactivity", () => {
    const parsed = reportSchema.safeParse({
      ...session,
      lecturerPresent: "PRESENT",
      teachingAids: ["SLIDES"]
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a present payload with no teaching aids", () => {
    const parsed = reportSchema.safeParse({
      ...session,
      lecturerPresent: "PRESENT",
      wasInteractive: "YES",
      teachingAids: []
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a present payload with interactivity and teaching aids", () => {
    expect(
      reportSchema.safeParse({
        ...session,
        lecturerPresent: "PRESENT",
        wasInteractive: "YES",
        teachingAids: ["SLIDES"]
      }).success
    ).toBe(true);
  });
});
