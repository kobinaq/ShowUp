import { PresenceStatus, SessionReportCoverage } from "@prisma/client";
import {
  backupEscalationSms,
  confirmationDisagrees,
  isWithinLateSubmissionWindow,
  lateSubmissionDeadline,
  nextReportCoverage,
  parseSmsReportBody,
  shouldEscalateToBackup,
  shouldFlagRepReliability,
  shouldMarkNoData
} from "@/lib/services/rep-reliability";

describe("rep reliability helpers", () => {
  const windowClosedAt = new Date("2026-09-01T12:00:00.000Z");

  it("allows late submission only inside the late window", () => {
    expect(isWithinLateSubmissionWindow(new Date("2026-09-01T11:59:00.000Z"), windowClosedAt, 24)).toBe(false);
    expect(isWithinLateSubmissionWindow(new Date("2026-09-01T18:00:00.000Z"), windowClosedAt, 24)).toBe(true);
    expect(isWithinLateSubmissionWindow(new Date("2026-09-02T13:00:00.000Z"), windowClosedAt, 24)).toBe(false);
  });

  it("computes late deadline from window close", () => {
    expect(lateSubmissionDeadline(windowClosedAt, 24)).toEqual(new Date("2026-09-02T12:00:00.000Z"));
  });

  it("escalates to backup after class end + minutes when primary is silent", () => {
    const classEndAt = new Date("2026-09-01T10:00:00.000Z");
    expect(
      shouldEscalateToBackup({
        now: new Date("2026-09-01T10:29:00.000Z"),
        classEndAt,
        backupEscalateMinutes: 30,
        hasAnyReport: false,
        alreadyNotifiedBackup: false
      })
    ).toBe(false);
    expect(
      shouldEscalateToBackup({
        now: new Date("2026-09-01T10:30:00.000Z"),
        classEndAt,
        backupEscalateMinutes: 30,
        hasAnyReport: false,
        alreadyNotifiedBackup: false
      })
    ).toBe(true);
    expect(
      shouldEscalateToBackup({
        now: new Date("2026-09-01T11:00:00.000Z"),
        classEndAt,
        backupEscalateMinutes: 30,
        hasAnyReport: true,
        alreadyNotifiedBackup: false
      })
    ).toBe(false);
  });

  it("marks NO_DATA after late deadline without treating it as lecture missed", () => {
    expect(
      shouldMarkNoData({
        now: new Date("2026-09-02T12:00:00.000Z"),
        lateDeadline: new Date("2026-09-02T12:00:00.000Z"),
        hasAnyReport: false,
        alreadyMarked: false
      })
    ).toBe(true);
    expect(
      shouldMarkNoData({
        now: new Date("2026-09-02T12:00:00.000Z"),
        lateDeadline: new Date("2026-09-02T12:00:00.000Z"),
        hasAnyReport: true,
        alreadyMarked: false
      })
    ).toBe(false);
  });

  it("maps report coverage including late tag", () => {
    expect(nextReportCoverage(true, false, SessionReportCoverage.PENDING)).toBe(SessionReportCoverage.REPORTED);
    expect(nextReportCoverage(true, true, SessionReportCoverage.PENDING)).toBe(SessionReportCoverage.LATE_REPORTED);
    expect(nextReportCoverage(false, false, SessionReportCoverage.NO_DATA)).toBe(SessionReportCoverage.NO_DATA);
  });

  it("flags reps only after the miss threshold", () => {
    expect(shouldFlagRepReliability(2, 3)).toBe(false);
    expect(shouldFlagRepReliability(3, 3)).toBe(true);
  });

  it("detects lecturer confirmation disagreement", () => {
    expect(confirmationDisagrees(PresenceStatus.PRESENT, PresenceStatus.ABSENT)).toBe(true);
    expect(confirmationDisagrees(PresenceStatus.PRESENT, PresenceStatus.PRESENT)).toBe(false);
  });

  it("parses SMS report bodies for fallback submission", () => {
    expect(parseSmsReportBody("PRESENT CENG301")).toEqual({
      presence: PresenceStatus.PRESENT,
      courseCode: "CENG301",
      notes: ""
    });
    expect(parseSmsReportBody("absent mkt302 projector failed")).toEqual({
      presence: PresenceStatus.ABSENT,
      courseCode: "MKT302",
      notes: "projector failed"
    });
    expect(parseSmsReportBody("hello")).toBeNull();
  });

  it("builds a backup escalation SMS", () => {
    expect(backupEscalationSms({ courseCode: "CENG301", lectureDate: "2026-09-01", endTime: "10:00" })).toContain(
      "Primary rep has not reported"
    );
  });
});
