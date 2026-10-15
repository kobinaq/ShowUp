import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { createRosterProposalSchema } from "@/lib/validators/roster-proposal";

type Params = { params: Promise<{ id: string }> };

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = createRosterProposalSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid roster proposal", parsed.error.flatten());
  const course = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  const existing = await prisma.rosterProposal.findFirst({
    where: { courseId: id, realEmail: parsed.data.realEmail, status: "PENDING" }
  });
  if (existing) return json({ error: "A pending proposal already exists for this email" }, { status: 409 });
  const proposal = await prisma.rosterProposal.create({
    data: {
      courseId: id,
      realName: parsed.data.realName,
      realEmail: parsed.data.realEmail,
      realPhone: parsed.data.realPhone,
      proposedById: profile.id
    }
  });
  return json({ data: proposal }, { status: 201 });
}, [Role.HOD, Role.HOD_ASSISTANT, Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT]);
