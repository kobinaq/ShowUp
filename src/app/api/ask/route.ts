import { Role } from "@prisma/client";
import { z } from "zod";
import { forbidden, withAuth, badRequest, json } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { executeQueryPlan } from "@/lib/services/ask.queries";
import { formatAnswer, parseQuestion } from "@/lib/services/ask.service";

const askSchema = z.object({
  question: z.string().trim().min(3).max(500)
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = askSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Question too short", parsed.error.flatten());
  const settings = await prisma.universitySettings.findUnique({ where: { universityId: profile.universityId }, select: { showUpAiEnabled: true } });
  if (settings?.showUpAiEnabled === false) {
    return json({
      answer: "Meridiqa AI is currently disabled for this university."
    });
  }

  try {
    const plan = await parseQuestion(parsed.data.question);

    if (plan.params.period === "unrecognized") {
      return json({
        answer:
          "I can answer for today, yesterday, this week, last week, this month, last month, this semester, last semester, or this academic year.",
        plan
      });
    }

    if (plan.queryType === "unsupported") {
      return json({
        answer:
          "I can only answer questions about lecturer attendance, topic coverage, flags, and department performance in Meridiqa."
      });
    }

    if ((profile.role === Role.HOD || profile.role === Role.HOD_ASSISTANT) && !profile.departmentId) {
      return forbidden("HOD analytics require a department assignment");
    }

    const data = await executeQueryPlan(plan, {
      id: profile.id,
      role: profile.role,
      universityId: profile.universityId,
      departmentId: profile.departmentId
    });
    const answer = await formatAnswer(parsed.data.question, data, plan.params.period, plan.params);

    return json({ answer, data, plan });
  } catch (error) {
    console.error("Meridiqa AI request failed", classifyAskError(error));
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return json({
        answer: "Meridiqa AI is handling a lot of questions right now. Please try again in a moment."
      });
    }
    return json(
      {
        error: "Meridiqa AI is unavailable",
        answer: "Meridiqa AI could not answer that right now. Please check the Groq API key and try again."
      },
      { status: 503 }
    );
  }
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.VC, Role.HOD, Role.HOD_ASSISTANT]);

function classifyAskError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("GROQ_API_KEY")) return { provider: "groq", reason: "missing_api_key" };
  if (message === "RATE_LIMIT_EXCEEDED" || /quota|rate|429/i.test(message)) return { provider: "groq", reason: "quota_or_rate_limit", message };
  if (/api key|permission|forbidden|401|403/i.test(message)) return { provider: "groq", reason: "auth_or_permission", message };
  if (/model|not found|404/i.test(message)) return { provider: "groq", reason: "model_unavailable", message };
  return { provider: "groq", reason: "unknown", message };
}
