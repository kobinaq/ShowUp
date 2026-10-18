import { PresenceStatus } from "@prisma/client";
import { presenceDisagrees } from "@/lib/services/report-discrepancy";

describe("presenceDisagrees", () => {
  it("treats a second reporter disagreement as a discrepancy", () => {
    expect(presenceDisagrees(PresenceStatus.PRESENT, PresenceStatus.ABSENT)).toBe(true);
    expect(presenceDisagrees(PresenceStatus.PRESENT, PresenceStatus.PRESENT)).toBe(false);
  });
});
