import { DEFAULT_GROQ_MODEL, formatAnswer, groqModel, planQuestion, withInferredPeriod } from "@/lib/services/ask.service";

describe("planQuestion", () => {
  it("routes the demo questions to a dated query and defaults to the semester", () => {
    expect(planQuestion("which lecturers have been late this week")).toMatchObject({
      queryType: "top_late",
      params: { period: "week", semesterId: "active" }
    });
    expect(planQuestion("who missed classes today")).toMatchObject({
      queryType: "top_absent",
      params: { period: "today" }
    });
    expect(planQuestion("coverage this month")).toMatchObject({
      queryType: "topic_coverage",
      params: { period: "month" }
    });
    expect(planQuestion("who has been late the most")).toMatchObject({
      queryType: "top_late",
      params: { period: "semester" }
    });
    expect(planQuestion("Which courses are behind on coverage?")).toMatchObject({
      queryType: "coverage_lag",
      params: { period: "semester" }
    });
    expect(planQuestion("Who has been late more than 3 times?")).toMatchObject({
      queryType: "top_late",
      params: { period: "semester", threshold: 3 }
    });
  });

  it("refuses a period it cannot resolve instead of answering for the whole semester", () => {
    expect(planQuestion("who was late next week")?.params.period).toBe("unrecognized");
  });

  it("keeps explicit dates supplied for a between-range question", () => {
    const plan = withInferredPeriod("who was late between 1 March and 15 March", {
      queryType: "top_late",
      params: { from: "2026-03-01", to: "2026-03-15", semesterId: "active" },
      intent: "late in a range"
    });
    expect(plan.params.period).toBeUndefined();
    expect(plan.params.from).toBe("2026-03-01");
    expect(plan.params.to).toBe("2026-03-15");
  });

  it("answers an empty week without calling the model", async () => {
    await expect(formatAnswer("which lecturers have been late this week", [], "week")).resolves.toBe(
      "No lecturers were recorded late this week."
    );
  });
});

describe("groqModel", () => {
  const original = process.env.GROQ_MODEL;

  afterEach(() => {
    if (original === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = original;
  });

  it("defaults to the current Groq Qwen model and honors GROQ_MODEL", () => {
    delete process.env.GROQ_MODEL;
    expect(DEFAULT_GROQ_MODEL).toBe("qwen/qwen3.8-27b");
    expect(groqModel()).toBe("qwen/qwen3.8-27b");
    process.env.GROQ_MODEL = "custom/model";
    expect(groqModel()).toBe("custom/model");
  });
});
