import { FlagEventType } from "@prisma/client";
import { flagEventForCreate, flagEventForResolution } from "@/lib/services/flag-events";

describe("flag events", () => {
  it("records create and resolve payloads", () => {
    expect(flagEventForCreate()).toEqual({ type: FlagEventType.CREATED, note: undefined });
    expect(flagEventForResolution("Contest accepted")).toEqual({
      type: FlagEventType.RESOLVED,
      note: "Contest accepted"
    });
  });
});
