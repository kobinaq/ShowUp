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

    if (profile.role === "HOD" || profile.role === "HOD_ASSISTANT") {
      if (!profile.departmentId) return forbidden("HOD analytics require a department assignment");
      plan.params.departmentId = profile.departmentId;
    }

    const data = await executeQueryPlan(plan);
    const answer = await formatAnswer(parsed.data.question, data);

    return json({ answer, data, plan });
  } catch (error) {
    console.error(error);
    return json(
      {
        error: "Ask ShowUp is unavailable",
        answer: "Ask ShowUp could not answer that right now. Please check the Anthropic API key and try again."
      },
      { status: 503 }
    );
  }
}, [Role.QA_OFFICER, Role.VC, Role.HOD, Role.HOD_ASSISTANT]);
