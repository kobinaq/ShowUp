import { FlagEventType } from "@prisma/client";

export function flagEventForCreate(note?: string) {
  return { type: FlagEventType.CREATED, note };
}

export function flagEventForResolution(acceptedNote?: string) {
  return { type: FlagEventType.RESOLVED, note: acceptedNote };
}
