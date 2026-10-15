export const REPORT_DRAFTS_KEY = "showup:report-drafts";

export type ReportDraftPayload = {
  courseId: string;
  scheduleId: string;
  lectureDate: string;
  lecturerPresent: string | null;
};

export type StoredReportDraft = {
  payload: ReportDraftPayload & Record<string, unknown>;
  savedAt: string;
};

export function draftSessionKey(payload: Pick<ReportDraftPayload, "courseId" | "scheduleId" | "lectureDate">) {
  return `${payload.courseId}:${payload.scheduleId}:${payload.lectureDate.slice(0, 10)}`;
}

export function parseReportDrafts(raw: string | null): StoredReportDraft[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredReportDraft);
  } catch {
    return [];
  }
}

export function upsertReportDraft(existing: StoredReportDraft[], draft: StoredReportDraft) {
  const key = draftSessionKey(draft.payload);
  return [...existing.filter((item) => draftSessionKey(item.payload) !== key), draft];
}

export function removeReportDraft(
  existing: StoredReportDraft[],
  payload: Pick<ReportDraftPayload, "courseId" | "scheduleId" | "lectureDate">
) {
  const key = draftSessionKey(payload);
  return existing.filter((item) => draftSessionKey(item.payload) !== key);
}

function isStoredReportDraft(value: unknown): value is StoredReportDraft {
  if (!value || typeof value !== "object") return false;
  if (!("payload" in value) || !("savedAt" in value)) return false;
  const payload = value.payload;
  if (!payload || typeof payload !== "object") return false;
  return (
    "courseId" in payload &&
    typeof payload.courseId === "string" &&
    "scheduleId" in payload &&
    typeof payload.scheduleId === "string" &&
    "lectureDate" in payload &&
    typeof payload.lectureDate === "string"
  );
}
