export { REPORT_DRAFTS_KEY } from "@/lib/branding/storage-keys";

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

/** Verify a draft is still valid to flush (same calendar day session + presence set). */
export function verifyReportDraft(draft: StoredReportDraft, now = new Date()) {
  if (!isStoredReportDraft(draft)) return { ok: false as const, reason: "malformed" };
  const presence = draft.payload.lecturerPresent;
  if (presence !== "PRESENT" && presence !== "ABSENT" && presence !== "SUBSTITUTE") {
    return { ok: false as const, reason: "missing_presence" };
  }
  const day = draft.payload.lectureDate.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  if (day !== today) return { ok: false as const, reason: "stale_date" };
  return { ok: true as const };
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
