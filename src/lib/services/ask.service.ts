import Groq, { APIError } from "groq-sdk";
import { z } from "zod";
import { askQueryTypes, type QueryPlan } from "@/types/ask";

const MODEL = "qwen/qwen3.6-27b";

const queryPlanSchema = z.object({
  queryType: z.enum(askQueryTypes),
  params: z
    .object({
      lecturerId: z.string().optional(),
      courseId: z.string().optional(),
      departmentId: z.string().optional(),
      semesterId: z.string().optional(),
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

type ChatCreateParams = Parameters<Groq["chat"]["completions"]["create"]>[0];

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
      const response = await groqClient().chat.completions.create(params);
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

export async function parseQuestion(question: string): Promise<QueryPlan> {
  const raw = await callGroqWithRetry({
    model: MODEL,
    max_tokens: 400,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a query planner for ShowUp, a university lecturer quality assurance platform.

ShowUp tracks:
- Lecturer attendance (present / absent / late / early dismissal) per class session
- Topic coverage: % of course outline topics taught vs expected by current week
- Flags: ABSENCE, LATENESS, EARLY_DISMISSAL, COVERAGE_LAG, REPEATED_ABSENCE, REPEATED_LATENESS
- Late pings: alerts sent when a lecturer is late, with acknowledgement status
- Courses, departments, faculties, and semesters

Available query types and their parameters:
- "lecturer_attendance": { lecturerId?, departmentId?, semesterId?, limit? }
- "topic_coverage": { courseId?, departmentId?, semesterId? }
- "flags": { lecturerId?, type?, departmentId?, semesterId?, limit? }
- "top_absent": { departmentId?, semesterId?, limit? }
- "top_late": { departmentId?, semesterId?, limit? }
- "coverage_lag": { threshold?, semesterId?, departmentId?, courseId? }
- "department_summary": { departmentId?, semesterId? }
- "ping_history": { lecturerId?, departmentId?, semesterId?, limit? }

Respond ONLY with a valid JSON object, no explanation, no markdown, no code fences. Example:
{"queryType":"top_absent","params":{"limit":5,"semesterId":"active"},"intent":"Find the lecturers with the most absences"}

If the question is unrelated to ShowUp data, respond exactly with:
{"queryType":"unsupported","params":{},"intent":""}`
      },
      { role: "user", content: question }
    ]
  });

  try {
    return queryPlanSchema.parse(JSON.parse(cleanJson(raw)));
  } catch {
    return { queryType: "unsupported", params: {}, intent: "" };
  }
}

export async function formatAnswer(question: string, data: object): Promise<string> {
  let dataString = JSON.stringify(data, null, 2);
  const estimatedTokens = estimateTokens(dataString) + estimateTokens(question) + 200;
  if (estimatedTokens > 6000) {
    dataString = JSON.stringify(Array.isArray(data) ? data.slice(0, 20) : data, null, 2);
    dataString += "\n\n[Note: result set was large and has been truncated to the first 20 records for this summary.]";
  }

  const answer = await callGroqWithRetry({
    model: MODEL,
    max_tokens: 350,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are the ShowUp analytics assistant for a university quality assurance platform.
You will receive a user's question and the relevant data fetched from the ShowUp database.
Write a clear, concise, plain-English answer in 1-4 sentences.
Use specific names, numbers, and percentages from the data.
Do not mention databases, APIs, JSON, or any technical terms.
If the data is empty, say so clearly and suggest why (e.g. "No absences recorded this semester yet.").`
      },
      { role: "user", content: `Question: ${question}\n\nData: ${dataString}` }
    ]
  });

  return answer || "I could not generate an answer from the available data. Please try rephrasing your question.";
}

function cleanJson(text: string) {
  return text.replace(/```json|```/g, "").trim();
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
