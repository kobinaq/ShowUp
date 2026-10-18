import { verifyReportDraft, type StoredReportDraft } from "@/lib/reports/offline-draft";

describe("verifyReportDraft", () => {
  const base: StoredReportDraft = {
    payload: {
      courseId: "course_1",
      scheduleId: "sched_1",
      lectureDate: "2026-09-01T08:00:00.000Z",
      lecturerPresent: "PRESENT"
    },
    savedAt: "2026-09-01T09:00:00.000Z"
  };

  it("accepts a same-day draft with presence", () => {
    expect(verifyReportDraft(base, new Date("2026-09-01T12:00:00.000Z"))).toEqual({ ok: true });
  });

  it("rejects stale drafts", () => {
    expect(verifyReportDraft(base, new Date("2026-09-02T12:00:00.000Z"))).toEqual({
      ok: false,
      reason: "stale_date"
    });
  });

  it("rejects drafts without presence", () => {
    expect(
      verifyReportDraft(
        { ...base, payload: { ...base.payload, lecturerPresent: null } },
        new Date("2026-09-01T12:00:00.000Z")
      )
    ).toEqual({ ok: false, reason: "missing_presence" });
  });
});
