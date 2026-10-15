import { ContestStatus } from "@prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

export function contestDeadline(raisedAt: Date, slaDays: number) {
  const days = slaDays > 0 ? slaDays : 5;
  return new Date(raisedAt.getTime() + days * DAY_MS);
}

export function isContestOverdue(input: {
  status: ContestStatus;
  raisedAt: Date;
  slaDays: number;
  now: Date;
}) {
  if (input.status !== ContestStatus.PENDING) return false;
  return input.now.getTime() >= contestDeadline(input.raisedAt, input.slaDays).getTime();
}
