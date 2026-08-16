import { ContestStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, contestScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { resolveContestSchema } from "@/lib/validators/contest";
import { coverageService } from "@/lib/services/coverage.service";
import { contestIsPending, reportFlagsForResolution } from "@/lib/services/contest-resolution";
import { notificationService } from "@/lib/services/notification.service";

type Params = { params: Promise<{ id: string }> };

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = resolveContestSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid resolution payload", parsed.error.flatten());
  const existing = await prisma.contest.findFirst({
    where: andWhere({ id }, contestScope(profile)),
    select: {
      id: true,
      status: true,
      raisedBy: { select: { email: true } },
      report: { select: { lectureDate: true, course: { select: { code: true } } } }
    }
  });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  if (!contestIsPending(existing.status)) {
    return json({ error: "Contest is already resolved" }, { status: 409 });
  }
  const accepted = parsed.data.status === ContestStatus.ACCEPTED;
  const contest = await prisma.$transaction(async (tx) => {
    const resolved = await tx.contest.update({
      where: { id },
      data: { status: parsed.data.status, resolutionNote: parsed.data.resolutionNote, resolvedById: profile.id, resolvedAt: new Date() },
      include: { report: true }
    });
    await tx.lectureReport.update({
      where: { id: resolved.reportId },
      data: reportFlagsForResolution(accepted)
    });
    if (accepted) {
      await tx.flag.updateMany({ where: { reportId: resolved.reportId }, data: { isResolved: true, internalNotes: "Contest accepted" } });
    }
    return resolved;
  });
  await coverageService.recalculateAndFlag(contest.report.courseId);
  if (existing.raisedBy.email) {
    await notificationService.contestResolved(
      existing.raisedBy.email,
      existing.report.course.code,
      existing.report.lectureDate.toDateString(),
      parsed.data.status,
      parsed.data.resolutionNote ?? ""
    );
  }
  return json({ data: contest });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT]);
