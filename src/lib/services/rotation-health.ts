import { assignmentIsDue } from "@/lib/services/rotation.service";

const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = DAY_MS * 7;

export function assignmentDueAt(assignment: { endDate: Date | null; startDate: Date; rotationWeeks: number }) {
  if (assignment.endDate) return assignment.endDate;
  const weeks = assignment.rotationWeeks > 0 ? assignment.rotationWeeks : 4;
  return new Date(assignment.startDate.getTime() + weeks * WEEK_MS);
}

export function daysOverdue(
  assignment: { endDate: Date | null; startDate: Date; rotationWeeks: number },
  now: Date
) {
  if (!assignmentIsDue(assignment, now)) return 0;
  const dueAt = assignmentDueAt(assignment);
  return Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS));
}

export function latestRotationFailure(logs: Array<{ action: string; error: string | null; createdAt: Date }>) {
  const failed = [...logs]
    .filter((log) => log.action === "failed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return failed?.error ?? null;
}
