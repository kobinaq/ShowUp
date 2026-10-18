import { PresenceStatus } from "@prisma/client";

export function presenceDisagrees(first: PresenceStatus, second: PresenceStatus) {
  return first !== second;
}
