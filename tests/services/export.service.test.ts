import { ExportService } from "@/lib/services/export.service";

describe("ExportService", () => {
  it("creates report CSV", () => {
    const csv = new ExportService().reportsCsv([{ course: "CS301", presence: "PRESENT" }]);
    expect(csv).toContain("CS301");
    expect(csv).toContain("PRESENT");
  });
});
