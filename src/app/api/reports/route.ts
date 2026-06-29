import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";
import { reportSchema } from "@/lib/validators/report";
import { flagService } from "@/lib/services/flag.service";
import { coverageService } from "@/lib/services/coverage.service";

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const where = {
    ...(url.searchParams.get("courseId") ? { courseId: url.searchParams.get("courseId")! } : {}),
    ...(url.searchParams.get("presence") ? { lecturerPresent: url.searchParams.get("presence") as never } : {}),
    ...(profile.departmentId && ["HOD", "HOD_ASSISTANT"].includes(profile.role)
      ? { course: { departmentId: profile.departmentId } }
      : {})
  };
  const reports = await prisma.lectureReport.findMany({
    where,
    include: {
      course: { include: { lecturer: true, department: true } },
      schedule: true,
      submittedBy: { select: { anonymousAlias: true } },
      topicsCovered: { include: { topic: true } },
      teachingAids: true,
      flags: true,
      contest: true
    },
    orderBy: { lectureDate: "desc" },
    take: 100
  });
  return json({ data: reports });
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid report payload", parsed.error.flatten());
  if (profile.role === Role.CLASS_REP) {
    const assignment = await prisma.repAssignment.findFirst({
      where: { profileId: profile.id, courseId: parsed.data.courseId, isActive: true }
    });
    if (!assignment) return forbidden("Class reps can only report assigned active courses");
  }
  const windowHours = Number(process.env.SUBMISSION_WINDOW_HOURS ?? 2);
  const windowClosedAt = new Date(Date.now() + windowHours * 60 * 60 * 1000);
  const isAbsent = parsed.data.lecturerPresent === "ABSENT";
  const { topicIds, teachingAids, ...data } = parsed.data;
  const report = await prisma.lectureReport.create({
    data: {
      ...data,
      arrivalStatus: isAbsent ? undefined : data.arrivalStatus,
      lateMinutes: isAbsent ? undefined : data.lateMinutes,
      earlyDismissal: isAbsent ? false : data.earlyDismissal,
      dismissedEarlyMinutes: isAbsent ? undefined : data.dismissedEarlyMinutes,
      previousTopicsRevisited: isAbsent ? false : data.previousTopicsRevisited,
      wasInteractive: isAbsent ? "NO" : data.wasInteractive!,
      studentCount: isAbsent ? undefined : data.studentCount,
      submittedById: profile.id,
      windowClosedAt,
      topicsCovered: { create: isAbsent ? [] : topicIds.map((topicId) => ({ topicId })) },
      teachingAids: { create: (isAbsent ? ["NONE"] : teachingAids).map((type) => ({ type })) }
    },
    include: { topicsCovered: true, teachingAids: true }
  });
  await flagService.evaluateReport(report.id);
  await coverageService.recalculateAndFlag(report.courseId);
  return json({ data: report }, { status: 201 });
}, [Role.CLASS_REP, Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
