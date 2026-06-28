import { executeQueryPlan } from "@/lib/services/ask.queries";

describe("executeQueryPlan", () => {
  it("returns an empty result for unsupported plans", async () => {
    await expect(
      executeQueryPlan({ queryType: "unsupported", params: {}, intent: "" })
    ).resolves.toEqual([]);
  });
});
