export type QualityAttendanceRow = {
  scopeId: string;
  scopeName: string;
  scopeType: "FACULTY" | "DEPARTMENT" | "COURSE";
  reportCount: number;
  absenceRate: number;
  latenessRate: number;
  studentAttendanceRate: number | null;
  openFlags: number;
  takeaway: string;
};

export function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function qualityAttendanceTakeaway(row: Omit<QualityAttendanceRow, "takeaway">): string {
  if (!row.reportCount) return `${row.scopeName} has no reports in this period yet.`;
  if (row.absenceRate >= 15) {
    return `${row.scopeName}: absence pressure is high (${row.absenceRate}%). Review lecturer coverage before month-end.`;
  }
  if (row.latenessRate >= 20) {
    return `${row.scopeName}: punctuality needs attention (${row.latenessRate}% late). Check facilities attribution before blaming lecturers.`;
  }
  if (row.studentAttendanceRate !== null && row.studentAttendanceRate < 70) {
    return `${row.scopeName}: student headcount is low vs class size (${row.studentAttendanceRate}%). Pair with late/missed lecture checks.`;
  }
  if (row.openFlags >= 3) {
    return `${row.scopeName}: ${row.openFlags} open flags — quality issues are stacking.`;
  }
  return `${row.scopeName}: attendance and lecture quality look steady this period.`;
}

export function buildQualityAttendanceRow(
  input: Omit<QualityAttendanceRow, "absenceRate" | "latenessRate" | "studentAttendanceRate" | "takeaway"> & {
    absences: number;
    late: number;
    studentRatedSessions: number;
    studentPresentEquivalent: number;
  }
): QualityAttendanceRow {
  const absenceRate = rate(input.absences, input.reportCount);
  const latenessRate = rate(input.late, input.reportCount);
  const studentAttendanceRate = input.studentRatedSessions
    ? rate(input.studentPresentEquivalent, input.studentRatedSessions)
    : null;
  const base = {
    scopeId: input.scopeId,
    scopeName: input.scopeName,
    scopeType: input.scopeType,
    reportCount: input.reportCount,
    absenceRate,
    latenessRate,
    studentAttendanceRate,
    openFlags: input.openFlags
  };
  return { ...base, takeaway: qualityAttendanceTakeaway(base) };
}

export function chartTakeaway(input: {
  title: string;
  topLabel?: string;
  topValue?: number;
  emptyMessage: string;
}) {
  if (!input.topLabel || input.topValue == null) return input.emptyMessage;
  return `${input.title}: ${input.topLabel} leads at ${input.topValue}.`;
}

/** Demo Ask Meridiqa prompts that answer well on ATU seed data. */
export const DEMO_ASK_QUESTIONS = [
  "Which lecturers have been late this week?",
  "Which lecturers missed the most classes this semester?",
  "Which courses are behind on their outline?",
  "Show unresolved flags",
  "Summarize the biggest risks in my scope",
  "Give me a department summary for Engineering"
] as const;
