import { reportsCsv } from "@/lib/services/export.service";

describe("reportsCsv", () => {
  it("creates report CSV", () => {
    const csv = reportsCsv([{ course: "CS301", presence: "PRESENT" }]);
    expect(csv).toContain("CS301");
    expect(csv).toContain("PRESENT");
  });
});
