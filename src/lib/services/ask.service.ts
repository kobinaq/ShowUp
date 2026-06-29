import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { askQueryTypes, type QueryPlan } from "@/types/ask";

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

function geminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function parseQuestion(question: string): Promise<QueryPlan> {
  const response = await geminiClient().models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    config: {
      temperature: 0,
      maxOutputTokens: 500,
      responseMimeType: "application/json",
      systemInstruction: `You are a query planner for ShowUp, a university lecturer quality assurance platform.

ShowUp tracks:
- Lecturer attendance (present / absent / late / early dismissal) per class session
- Topic coverage: % of course outline topics taught vs expected by current week
- Flags: ABSENCE, LATENESS, EARLY_DISMISSAL, COVERAGE_LAG, REPEATED_ABSENCE, REPEATED_LATENESS
- Courses, departments, faculties, and semesters

Available query types and their parameters:
- "lecturer_attendance": { lecturerId?, departmentId?, semesterId?, limit? }
- "topic_coverage": { courseId?, departmentId?, semesterId? }
- "flags": { lecturerId?, type?, departmentId?, semesterId?, limit? }
- "top_absent": { departmentId?, semesterId?, limit? }
- "top_late": { departmentId?, semesterId?, limit? }
- "coverage_lag": { threshold?, semesterId?, departmentId?, courseId? }
- "department_summary": { departmentId?, semesterId? }

Respond ONLY with a valid JSON object, no explanation, no markdown. Example:
{
  "queryType": "top_absent",
  "params": { "limit": 5, "semesterId": "active" },
  "intent": "Find the lecturers with the most absences"
}

If the question is unrelated to ShowUp data, return:
{ "queryType": "unsupported", "params": {}, "intent": "" }`
    },
    contents: question
  });

  const text = response.text ?? "{}";
  const jsonText = text.replace(/```json|```/g, "").trim();
  return queryPlanSchema.parse(JSON.parse(jsonText));
}

export async function formatAnswer(question: string, data: object): Promise<string> {
  const response = await geminiClient().models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    config: {
      temperature: 0.2,
      maxOutputTokens: 400,
      systemInstruction: `You are the ShowUp analytics assistant for a university quality assurance platform.
You will receive a user's question and the relevant data fetched from the ShowUp database.
Write a clear, concise, plain-English answer in 1-4 sentences.
Use specific names, numbers, and percentages from the data.
Do not mention databases, APIs, or technical terms.
If the data is empty, say so clearly and suggest why (e.g. "No absences recorded this semester yet.").`
    },
    contents: `Question: ${question}\n\nData: ${JSON.stringify(data, null, 2)}`
  });

  return response.text ?? "Sorry, I could not generate an answer. Please try again.";
}
