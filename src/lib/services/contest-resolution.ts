import { ContestStatus } from "@prisma/client";

export function reportFlagsForResolution(accepted: boolean) {
  return { isVoided: accepted, isContested: false };
}

export function contestIsPending(status: ContestStatus) {
  return status === ContestStatus.PENDING;
}
