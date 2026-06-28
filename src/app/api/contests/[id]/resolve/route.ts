import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { resolveContestSchema } from "@/lib/validators/contest";
import { coverageService } from "@/lib/services/coverage.service";

type Params = { params: Promise<{ id: string }> };

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = resolveContestSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid resolution payload", parsed.error.flatten());
  const contest = await prisma.$transaction(async (tx) => {
    const resolved = await tx.contest.update({
      where: { id },
      data: { status: parsed.data.status, resolutionNote: parsed.data.resolutionNote, resolvedById: profile.id, resolvedAt: new Date() },
      include: { report: true }
    });
    if (parsed.data.status === "ACCEPTED") {
      await tx.lectureReport.update({ where: { id: resolved.reportId }, data: { isVoided: true } });
      await tx.flag.updateMany({ where: { reportId: resolved.reportId }, data: { isResolved: true, internalNotes: "Contest accepted" } });
    }
    return resolved;
  });
  await coverageService.recalculateAndFlag(contest.report.courseId);
  return json({ data: contest });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER]);
