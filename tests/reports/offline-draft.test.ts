import { parseReportDrafts, removeReportDraft, upsertReportDraft } from "@/lib/reports/offline-draft";

const draft = {
  payload: {
    courseId: "course123",
    scheduleId: "schedule1",
    lectureDate: "2026-08-16T10:00:00.000Z",
    lecturerPresent: "ABSENT"
  },
  savedAt: "2026-08-16T10:05:00.000Z"
};

describe("offline report drafts", () => {
  it("parses a stored list and ignores junk", () => {
    expect(parseReportDrafts(null)).toEqual([]);
    expect(parseReportDrafts("not-json")).toEqual([]);
    expect(parseReportDrafts(JSON.stringify([draft, { nope: true }]))).toEqual([draft]);
  });

  it("replaces a draft for the same session", () => {
    const next = { ...draft, savedAt: "2026-08-16T11:00:00.000Z" };
    expect(upsertReportDraft([draft], next)).toEqual([next]);
  });

  it("removes a flushed draft", () => {
    expect(removeReportDraft([draft], draft.payload)).toEqual([]);
  });
});
