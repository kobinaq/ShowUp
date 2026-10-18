import {
  buildQualityAttendanceRow,
  chartTakeaway,
  DEMO_ASK_QUESTIONS,
  qualityAttendanceTakeaway,
  rate
} from "@/lib/services/insights.service";
import { monthlyReportCsv, monthlyReportExcelXml } from "@/lib/services/monthly-report.service";

describe("insights helpers", () => {
  it("computes rates", () => {
    expect(rate(1, 4)).toBe(25);
    expect(rate(0, 0)).toBe(0);
  });

  it("writes plain-language takeaways", () => {
    expect(
      qualityAttendanceTakeaway({
        scopeId: "1",
        scopeName: "Engineering / Civil",
        scopeType: "DEPARTMENT",
        reportCount: 10,
        absenceRate: 20,
        latenessRate: 5,
        studentAttendanceRate: 80,
        openFlags: 0
      })
    ).toContain("absence pressure");
  });

  it("builds combined rows", () => {
    const row = buildQualityAttendanceRow({
      scopeId: "d1",
      scopeName: "Business / Marketing",
      scopeType: "DEPARTMENT",
      reportCount: 8,
      absences: 1,
      late: 2,
      openFlags: 0,
      studentRatedSessions: 400,
      studentPresentEquivalent: 320
    });
    expect(row.absenceRate).toBe(13);
    expect(row.latenessRate).toBe(25);
    expect(row.studentAttendanceRate).toBe(80);
    expect(row.takeaway).toContain("punctuality");
  });

  it("exposes demo Ask questions", () => {
    expect(DEMO_ASK_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_ASK_QUESTIONS.some((q) => q.toLowerCase().includes("late"))).toBe(true);
  });

  it("builds chart takeaways", () => {
    expect(chartTakeaway({ title: "Flags", topLabel: "LATENESS", topValue: 4, emptyMessage: "none" })).toContain("LATENESS");
  });

  it("exports monthly csv and excel xml", () => {
    const rows = [
      buildQualityAttendanceRow({
        scopeId: "d1",
        scopeName: "Engineering / Civil",
        scopeType: "DEPARTMENT",
        reportCount: 4,
        absences: 0,
        late: 0,
        openFlags: 0,
        studentRatedSessions: 0,
        studentPresentEquivalent: 0
      })
    ];
    expect(monthlyReportCsv(rows, "September 2026")).toContain("Engineering / Civil");
    expect(monthlyReportExcelXml(rows, "September 2026")).toContain("Workbook");
  });
});
