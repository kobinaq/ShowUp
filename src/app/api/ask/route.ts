import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, withAuth, badRequest, json } from "@/lib/middleware/withAuth";
import { executeQueryPlan } from "@/lib/services/ask.queries";
import { formatAnswer, parseQuestion } from "@/lib/services/ask.service";

const askSchema = z.object({
  question: z.string().trim().min(3).max(500)
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = askSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Question too short", parsed.error.flatten());

  try {
    const plan = await parseQuestion(parsed.data.question);

    if (plan.queryType === "unsupported") {
      return json({
        answer:
          "I can only answer questions about lecturer attendance, topic coverage, flags, and department performance in ShowUp."
      });
    }

    const scope: { universityId?: string; departmentId?: string | null } = profile.role === "SUPER_ADMIN" ? {} : { universityId: profile.universityId };
    if (profile.role === "HOD" || profile.role === "HOD_ASSISTANT") {
      if (!profile.departmentId) return forbidden("HOD analytics require a department assignment");
      plan.params.departmentId = profile.departmentId;
      scope.departmentId = profile.departmentId;
    }

    const data = await executeQueryPlan(plan, scope);
    const answer = await formatAnswer(parsed.data.question, data);

    return json({ answer, data, plan });
  } catch (error) {
    console.error("ShowUp AI request failed", classifyAskError(error));
    return json(
      {
        error: "ShowUp AI is unavailable",
        answer: "ShowUp AI could not answer that right now. Please check the Gemini API key and try again."
      },
      { status: 503 }
    );
  }
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.VC, Role.HOD, Role.HOD_ASSISTANT]);

function classifyAskError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("GEMINI_API_KEY")) return { provider: "gemini", reason: "missing_api_key" };
  if (/quota|rate|429/i.test(message)) return { provider: "gemini", reason: "quota_or_rate_limit", message };
  if (/api key|permission|forbidden|401|403/i.test(message)) return { provider: "gemini", reason: "auth_or_permission", message };
  if (/model|not found|404/i.test(message)) return { provider: "gemini", reason: "model_unavailable", message };
  return { provider: "gemini", reason: "unknown", message };
}
