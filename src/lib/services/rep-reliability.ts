import { PresenceStatus, SessionReportCoverage } from "@prisma/client";

/** Late submission window: after normal close, up to N hours with a late tag. */
export function isWithinLateSubmissionWindow(now: Date, windowClosedAt: Date, lateSubmissionHours: number) {
  if (now <= windowClosedAt) return false;
  const lateDeadline = new Date(windowClosedAt.getTime() + lateSubmissionHours * 60 * 60 * 1000);
  return now <= lateDeadline;
}

export function lateSubmissionDeadline(windowClosedAt: Date, lateSubmissionHours: number) {
  return new Date(windowClosedAt.getTime() + lateSubmissionHours * 60 * 60 * 1000);
}

/** After class end + escalate minutes, primary still silent → notify backup. */
export function shouldEscalateToBackup(input: {
  now: Date;
  classEndAt: Date;
  backupEscalateMinutes: number;
  hasAnyReport: boolean;
  alreadyNotifiedBackup: boolean;
}) {
  if (input.hasAnyReport || input.alreadyNotifiedBackup) return false;
  const escalateAt = new Date(input.classEndAt.getTime() + input.backupEscalateMinutes * 60 * 1000);
  return input.now >= escalateAt;
}

/** After late-submission deadline with no report → NO_DATA (not lecture missed). */
export function shouldMarkNoData(input: {
  now: Date;
  lateDeadline: Date;
  hasAnyReport: boolean;
  alreadyMarked: boolean;
}) {
  if (input.hasAnyReport || input.alreadyMarked) return false;
  return input.now >= input.lateDeadline;
}

export function nextReportCoverage(hasReport: boolean, isLate: boolean, previous: SessionReportCoverage): SessionReportCoverage {
  if (!hasReport) return previous === SessionReportCoverage.NO_DATA ? previous : SessionReportCoverage.PENDING;
  return isLate ? SessionReportCoverage.LATE_REPORTED : SessionReportCoverage.REPORTED;
}

export function shouldFlagRepReliability(missedReportCount: number, threshold: number) {
  return missedReportCount >= threshold && threshold > 0;
}

export function confirmationDisagrees(reportPresence: PresenceStatus, confirmedPresence: PresenceStatus) {
  return reportPresence !== confirmedPresence;
}

export function backupEscalationSms(input: { courseCode: string; lectureDate: string; endTime: string }) {
  return `Meridiqa: Primary rep has not reported for ${input.courseCode} (${input.lectureDate} ended ${input.endTime}). Please submit as backup. Reply via the app.`;
}

export function primaryReminderSms(input: { courseCode: string; minutesLeft: number }) {
  return `Meridiqa reminder: ${input.courseCode} report window closes in ~${input.minutesLeft} min. Submit now to avoid a no-data mark.`;
}

/** Demo-safe SMS report parse: "PRESENT CENG301" or "ABSENT CENG301 notes...". */
export function parseSmsReportBody(body: string): { presence: PresenceStatus; courseCode: string; notes: string } | null {
  const trimmed = body.trim().replace(/\s+/g, " ");
  const match = /^(PRESENT|ABSENT|SUBSTITUTE)\s+([A-Z0-9]{3,12})(?:\s+(.+))?$/i.exec(trimmed);
  if (!match) return null;
  const presence = match[1].toUpperCase() as PresenceStatus;
  return {
    presence,
    courseCode: match[2].toUpperCase(),
    notes: (match[3] ?? "").trim()
  };
}
