import Groq, { APIError } from "groq-sdk";
import { z } from "zod";
import { hasUnrecognizedTimePhrase, inferAskPeriod, needsModelPeriod, periodLabelFor } from "@/lib/services/ask.period";
import { askQueryTypes, type AskPeriod, type QueryPlan } from "@/types/ask";

export const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

const modelPeriods = ["today", "yesterday", "week", "last_week", "month", "last_month", "semester", "previous_semester", "year"] as const;

export function groqModel() {
  const configured = process.env.GROQ_MODEL?.trim();
  return configured || DEFAULT_GROQ_MODEL;
}

const queryPlanSchema = z.object({
  queryType: z.enum(askQueryTypes),
  params: z
    .object({
      lecturerId: z.string().optional(),
      courseId: z.string().optional(),
      departmentId: z.string().optional(),
      semesterId: z.string().optional(),
      period: z.enum(modelPeriods).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      type: z
        .enum([
          "ABSENCE",
          "LATENESS",
          "EARLY_DISMISSAL",
          "COVERAGE_LAG",
          "REPEATED_ABSENCE",
          "REPEATED_LATENESS"
        ])
        .optional(),
      threshold: z.number().min(0).max(100).optional(),
      limit: z.number().int().min(1).max(50).optional()
    })
    .default({}),
  intent: z.string().default("")
});

type ChatCreateParams = Omit<Parameters<Groq["chat"]["completions"]["create"]>[0], "model">;

function groqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

async function callGroqWithRetry(params: ChatCreateParams, maxRetries = 2): Promise<string> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await groqClient().chat.completions.create({ ...params, model: groqModel() });
      return "choices" in response ? response.choices[0]?.message?.content ?? "" : "";
    } catch (error) {
      if (isRateLimitError(error) && attempt < maxRetries) {
        await wait(retryAfterMs(error));
        attempt += 1;
        continue;
      }
      if (isRateLimitError(error)) throw new Error("RATE_LIMIT_EXCEEDED");
      throw error;
    }
  }
  throw new Error("RATE_LIMIT_EXCEEDED");
}

export function planQuestion(question: string): QueryPlan | null {
  const fallback = parseCommonQuestion(question);
  if (!fallback || needsModelPeriod(question)) return null;
  return withInferredPeriod(question, fallback);
}

export function withInferredPeriod(question: string, plan: QueryPlan): QueryPlan {
  const inferred = inferAskPeriod(question);
  if (inferred) {
    return { ...plan, params: { ...plan.params, period: inferred, from: undefined, to: undefined } };
  }
  if ((hasUnrecognizedTimePhrase(question) || needsModelPeriod(question)) && !(plan.params.from && plan.params.to)) {
    return { ...plan, params: { ...plan.params, period: "unrecognized", from: undefined, to: undefined } };
  }
  if (plan.params.from && plan.params.to) {
    return { ...plan, params: { ...plan.params, period: undefined } };
  }
  return { ...plan, params: { ...plan.params, period: plan.params.period ?? "semester" } };
}

export async function parseQuestion(question: string): Promise<QueryPlan> {
  const local = planQuestion(question);
  if (local) return local;

  const raw = await callGroqWithRetry({
    max_tokens: 400,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a query planner for Meridiqa, a university lecturer quality assurance platform.

Default assumption: the user's question is about Meridiqa database records unless it is clearly personal, general knowledge, entertainment, medical, legal, financial, or otherwise not directed at university quality assurance data. Ambiguous analytics questions such as "who was late?", "what happened today?", "which courses are behind?", or "show problems" should be interpreted as Meridiqa database questions.

Meridiqa tracks:
- Lecturer attendance (present / absent / late / early dismissal) per class session
- Topic coverage: % of course outline topics taught vs expected by current week
- Flags: ABSENCE, LATENESS, EARLY_DISMISSAL, COVERAGE_LAG, REPEATED_ABSENCE, REPEATED_LATENESS
- Late pings: alerts sent when a lecturer is late, with acknowledgement status
- Courses, departments, faculties, and semesters

Available query types and their parameters:
- "lecturer_attendance": { lecturerId?, departmentId?, semesterId?, period?, limit? }
- "topic_coverage": { courseId?, departmentId?, semesterId?, period? }
- "flags": { lecturerId?, type?, departmentId?, semesterId?, period?, limit? }
- "top_absent": { departmentId?, semesterId?, period?, limit? }
- "top_late": { departmentId?, semesterId?, period?, limit?, threshold? }
- "coverage_lag": { threshold?, semesterId?, departmentId?, courseId?, period? }
- "department_summary": { departmentId?, semesterId?, period? }
- "ping_history": { lecturerId?, departmentId?, semesterId?, period?, limit? }

period is one of: today, yesterday, week, last_week, month, last_month, semester, previous_semester, year.
Use week for "this week", month for "this month", today for "today", previous_semester for "last semester", and year for "this academic year".
When the question gives exact dates, set params.from and params.to as YYYY-MM-DD and omit period.
When the question names no time range, omit period. The server then uses the active semester.

Respond ONLY with a valid JSON object, no explanation, no markdown, no code fences. Example:
{"queryType":"top_absent","params":{"limit":5,"semesterId":"active","period":"week"},"intent":"Find lecturers absent this week"}

For questions like "Who has been late more than 3 times?", respond:
{"queryType":"top_late","params":{"threshold":3,"semesterId":"active","period":"semester"},"intent":"Find lecturers with more than 3 late reports this semester"}

Only if the question is clearly unrelated to Meridiqa data, such as "what time will my wife arrive today?", respond exactly with:
{"queryType":"unsupported","params":{},"intent":""}`
      },
      { role: "user", content: question }
    ]
  });

  try {
    return withInferredPeriod(question, queryPlanSchema.parse(relaxPlan(JSON.parse(cleanJson(raw)))));
  } catch {
    const fallback = parseCommonQuestion(question);
    if (fallback) return withInferredPeriod(question, fallback);
    return { queryType: "unsupported", params: {}, intent: "" };
  }
}

export async function formatAnswer(
  question: string,
  data: object,
  period?: AskPeriod | null,
  range?: { from?: string; to?: string }
): Promise<string> {
  const periodLabel = !period && range?.from && range.to ? `${range.from} to ${range.to}` : periodLabelFor(period);
  const emptyAnswer = answerEmptyResult(question, data, periodLabel);
  if (emptyAnswer) return emptyAnswer;

  let dataString = JSON.stringify(data, null, 2);
  const estimatedTokens = estimateTokens(dataString) + estimateTokens(question) + 200;
  if (estimatedTokens > 6000) {
    dataString = JSON.stringify(Array.isArray(data) ? data.slice(0, 20) : data, null, 2);
    dataString += "\n\n[Note: result set was large and has been truncated to the first 20 records for this summary.]";
  }

  const answer = await callGroqWithRetry({
    max_tokens: 350,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are the Meridiqa analytics assistant for a university quality assurance platform.
You will receive a user's question and the relevant data fetched from the Meridiqa database.
The data is already limited to the time period in the question. If the question names no period, the data is for the current semester.
Each record's period field names that window. For coverage, taughtTopics and coveragePercent are cumulative through the end of the window. topicsReportedInPeriod counts topics reported inside the window, and topicsScheduledInPeriod counts outline topics scheduled in that window.
Write a clear, concise, plain-English answer in 1-4 sentences.
Name the time period in the answer.
Return only the final answer for the user. Do not include reasoning, analysis, chain-of-thought, markdown headings, tags, or notes.
Use specific names, numbers, and percentages from the data.
Do not mention databases, APIs, JSON, or any technical terms.
If the data is empty, say so clearly and suggest why (e.g. "No absences recorded this semester yet.").`
      },
      { role: "user", content: `Question: ${question}\nTime period: ${periodLabel}\n\nData: ${dataString}` }
    ]
  });

  return cleanFinalAnswer(answer) || "I could not generate an answer from the available data. Please try rephrasing your question.";
}

function cleanJson(text: string) {
  return text.replace(/```json|```/g, "").trim();
}

function cleanFinalAnswer(text: string) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/^\s*(Here's a thinking process:|Thinking process:|Analysis:)[\s\S]*?(Final answer:|Answer:)/i, "")
    .replace(/^\s*(Final answer:|Answer:)\s*/i, "")
    .trim();
}

function relaxPlan(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as { params?: { period?: string } };
  const period = record.params?.period;
  const aliases: Record<string, (typeof modelPeriods)[number]> = {
    this_week: "week",
    this_month: "month",
    this_semester: "semester",
    last_semester: "previous_semester",
    this_year: "year"
  };
  if (record.params && period && !modelPeriods.includes(period as (typeof modelPeriods)[number])) {
    const mapped = aliases[period];
    if (mapped) record.params.period = mapped;
    else delete record.params.period;
  }
  return record;
}

function answerEmptyResult(question: string, data: object, periodLabel: string) {
  const emptyArray = Array.isArray(data) && data.length === 0;
  const emptyObject = !Array.isArray(data) && Object.keys(data).length === 0;
  if (!emptyArray && !emptyObject) return null;

  const normalized = question.toLowerCase();
  const threshold = normalized.match(/more than\s+(\d+)|over\s+(\d+)|above\s+(\d+)/)?.slice(1).find(Boolean);
  if (/\blate\b|\blateness\b/.test(normalized)) {
    return threshold
      ? `No lecturer has been recorded late more than ${threshold} times ${periodLabel}.`
      : `No lecturers were recorded late ${periodLabel}.`;
  }
  if (/\babsent\b|\babsence\b|\bmissed\b/.test(normalized)) {
    return threshold
      ? `No lecturer has been recorded absent more than ${threshold} times ${periodLabel}.`
      : `No lecturers were recorded absent ${periodLabel}.`;
  }
  if (/\bbehind\b|\bcoverage\b|\boutline\b|\btopics?\b/.test(normalized)) {
    return `No course currently matches that coverage question ${periodLabel}.`;
  }
  return `No matching records were found ${periodLabel}.`;
}

function parseCommonQuestion(question: string): QueryPlan | null {
  const normalized = question.toLowerCase();
  const threshold = Number(normalized.match(/more than\s+(\d+)/)?.[1] ?? normalized.match(/over\s+(\d+)/)?.[1] ?? normalized.match(/above\s+(\d+)/)?.[1]);
  const params = {
    semesterId: "active",
    ...(Number.isFinite(threshold) && threshold > 0 ? { threshold } : {})
  };

  if (/\blate\b|\blateness\b/.test(normalized) && /\bwho\b|\bwhich lecturers?\b|\btop\b|\bmost\b/.test(normalized)) {
    return {
      queryType: "top_late",
      params,
      intent: "Find lecturers with repeated lateness"
    };
  }

  if (/\babsent\b|\babsence\b|\bmissed\b/.test(normalized) && /\bwho\b|\bwhich lecturers?\b|\btop\b|\bmost\b/.test(normalized)) {
    return {
      queryType: "top_absent",
      params,
      intent: "Find lecturers with repeated absences"
    };
  }

  if (/\bbehind\b|\blag\b|\bfalling behind\b/.test(normalized)) {
    return {
      queryType: "coverage_lag",
      params: { semesterId: "active" },
      intent: "Find courses behind expected topic coverage"
    };
  }

  if (/\bcoverage\b|\boutline\b|\btopics?\b/.test(normalized)) {
    return {
      queryType: "topic_coverage",
      params: { semesterId: "active" },
      intent: "Summarize topic coverage"
    };
  }

  if (/\bproblem|issue|flag|flags|risk|risks\b/.test(normalized)) {
    return {
      queryType: "flags",
      params: { semesterId: "active", limit: 10 },
      intent: "Find recent Meridiqa quality assurance flags"
    };
  }

  if (/\bdepartment|departments|performance|summary|summaries\b/.test(normalized)) {
    return {
      queryType: "department_summary",
      params: { semesterId: "active" },
      intent: "Summarize department performance"
    };
  }

  return null;
}

function isRateLimitError(error: unknown) {
  return error instanceof APIError && error.status === 429;
}

function retryAfterMs(error: unknown) {
  if (!(error instanceof APIError)) return 2000;
  const retryAfter = error.headers?.["retry-after"];
  const seconds = Number(Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 2000;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
