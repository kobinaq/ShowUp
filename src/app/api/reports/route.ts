import { AidType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope, reportScope, startOfSessionDay, timeOnSessionDate } from "@/lib/auth/scope";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";
import { reportSchema } from "@/lib/validators/report";
import { flagService } from "@/lib/services/flag.service";
import { coverageService } from "@/lib/services/coverage.service";
import { handlePostClassPingEscalation } from "@/lib/services/ping.service";

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const where = andWhere(reportScope(profile), {
    ...(url.searchParams.get("courseId") ? { courseId: url.searchParams.get("courseId")! } : {}),
    ...(url.searchParams.get("presence") ? { lecturerPresent: url.searchParams.get("presence") as never } : {})
  });
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

  const course = await prisma.course.findFirst({
    where: andWhere({ id: parsed.data.courseId }, courseScope(profile)),
    include: {
      schedule: true,
      department: { include: { faculty: true } }
    }
  });
  if (!course) return forbidden("Course is outside your scope");

  const schedule = course.schedule.find((item) => item.id === parsed.data.scheduleId);
  if (!schedule) return badRequest("Schedule does not belong to this course");

  const lectureDate = startOfSessionDay(parsed.data.lectureDate);
  if (lectureDate.getDay() !== schedule.dayOfWeek) return badRequest("This schedule does not meet on the selected date");

  const settings = await prisma.universitySettings.findUnique({ where: { universityId: course.department.faculty.universityId } });
  const windowHours = settings?.submissionWindowHours ?? Number(process.env.SUBMISSION_WINDOW_HOURS ?? 2);
  const classStartAt = timeOnSessionDate(lectureDate, schedule.startTime);
  const windowClosedAt = new Date(classStartAt.getTime() + windowHours * 60 * 60 * 1000);
  const now = new Date();
  if (profile.role === Role.CLASS_REP) {
    if (now < classStartAt) return badRequest("Reports can only be submitted after class starts");
    if (now > windowClosedAt) return forbidden("The reporting window for this session has closed");
  }

  const isAbsent = parsed.data.lecturerPresent === "ABSENT";
  const { topicIds, teachingAids, ...data } = parsed.data;
  if (!isAbsent && topicIds.length > 0) {
    const allowedTopics = await prisma.outlineTopic.count({ where: { id: { in: topicIds }, outline: { courseId: course.id } } });
    if (allowedTopics !== new Set(topicIds).size) return badRequest("One or more selected topics do not belong to this course");
  }

  let report;
  try {
    report = await prisma.lectureReport.create({
      data: {
        ...data,
        lectureDate,
        arrivalStatus: isAbsent ? undefined : data.arrivalStatus,
        lateMinutes: isAbsent ? undefined : data.lateMinutes,
        earlyDismissal: isAbsent ? false : data.earlyDismissal,
        dismissedEarlyMinutes: isAbsent ? undefined : data.dismissedEarlyMinutes,
        previousTopicsRevisited: isAbsent ? false : data.previousTopicsRevisited,
        wasInteractive: isAbsent ? "NO" : data.wasInteractive!,
        studentCount: isAbsent ? undefined : data.studentCount,
        submittedById: profile.id,
        windowClosedAt,
        topicsCovered: { create: isAbsent ? [] : Array.from(new Set(topicIds)).map((topicId) => ({ topicId })) },
        teachingAids: { create: (isAbsent ? [AidType.NONE] : teachingAids).map((type) => ({ type })) }
      },
      include: { topicsCovered: true, teachingAids: true }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ error: "A report has already been submitted for this class session" }, { status: 409 });
    }
    throw error;
  }
  await flagService.evaluateReport(report.id);
  await coverageService.recalculateAndFlag(report.courseId);
  await handlePostClassPingEscalation(report.courseId, report.lectureDate, report.lecturerPresent, report.id);
  return json({ data: report }, { status: 201 });
}, [Role.CLASS_REP, Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
