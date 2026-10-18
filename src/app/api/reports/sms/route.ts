import { AidType, PresenceStatus, Prisma, Role, SessionReportCoverage, SubmissionSource } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope, startOfSessionDay, timeOnSessionDate } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { createFlagsForReport, notifyAbsenceForReport } from "@/lib/services/flag.service";
import { recalculateAndFlag } from "@/lib/services/coverage.service";
import { isWithinLateSubmissionWindow, nextReportCoverage, parseSmsReportBody } from "@/lib/services/rep-reliability";
import { ensureLectureSession } from "@/lib/services/timetable";

const smsBodySchema = z.object({
  body: z.string().min(3).max(320),
  /** Optional override when the gateway already resolved the course. */
  courseId: z.string().optional()
});

/**
 * SMS fallback for class reps when the app is unreachable.
 * Format: "PRESENT CENG301" | "ABSENT CENG301 optional notes"
 */
export const POST = withAuth(async (request, { profile }) => {
  if (profile.role !== Role.CLASS_REP && profile.role !== Role.SUPER_ADMIN) {
    return forbidden("Only class reps can submit SMS reports");
  }
  const parsed = smsBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid SMS payload", parsed.error.flatten());

  const sms = parseSmsReportBody(parsed.data.body);
  if (!sms) return badRequest('SMS body must look like "PRESENT CENG301" or "ABSENT CENG301 notes"');

  const assignment = await prisma.repAssignment.findFirst({
    where: {
      profileId: profile.id,
      isActive: true,
      course: parsed.data.courseId ? { id: parsed.data.courseId } : { code: sms.courseCode }
    },
    include: {
      course: {
        include: {
          schedule: true,
          department: { include: { faculty: true } }
        }
      }
    }
  });
  if (!assignment) return forbidden("No active assignment matches that course code");

  const scoped = await prisma.course.findFirst({
    where: andWhere({ id: assignment.courseId }, courseScope(profile)),
    select: { id: true }
  });
  if (!scoped) return forbidden("Course is outside your scope");

  const today = startOfSessionDay(new Date());
  const schedule = assignment.course.schedule.find((item) => item.dayOfWeek === today.getDay());
  if (!schedule) return badRequest("No class is scheduled for this course today");

  const settings = await prisma.universitySettings.findUnique({
    where: { universityId: assignment.course.department.faculty.universityId }
  });
  const windowHours = settings?.submissionWindowHours ?? 2;
  const lateHours = settings?.lateSubmissionHours ?? 24;
  const classStartAt = timeOnSessionDate(today, schedule.startTime);
  const classEndAt = timeOnSessionDate(today, schedule.endTime);
  const windowClosedAt = new Date(classEndAt.getTime() + windowHours * 60 * 60 * 1000);
  const now = new Date();
  if (now < classStartAt) return badRequest("Reports can only be submitted after class starts");
  let isLateSubmission = false;
  if (now > windowClosedAt) {
    if (!isWithinLateSubmissionWindow(now, windowClosedAt, lateHours)) {
      return forbidden("The reporting window for this session has closed");
    }
    isLateSubmission = true;
  }

  const isAbsent = sms.presence === PresenceStatus.ABSENT;
  let report;
  try {
    report = await prisma.$transaction(async (tx) => {
      const session = await ensureLectureSession({ scheduleId: schedule.id, lectureDate: today, tx });
      const created = await tx.lectureReport.create({
        data: {
          courseId: assignment.courseId,
          scheduleId: schedule.id,
          lectureDate: today,
          lectureSessionId: session.id,
          lecturerPresent: sms.presence,
          arrivalStatus: isAbsent ? undefined : "ON_TIME",
          wasInteractive: isAbsent ? "NO" : "YES",
          additionalNotes: sms.notes || `Submitted via SMS fallback.`,
          submittedById: profile.id,
          windowClosedAt,
          isLateSubmission,
          submissionSource: SubmissionSource.SMS,
          teachingAids: { create: [{ type: AidType.NONE }] }
        }
      });
      await tx.lectureSession.update({
        where: { id: session.id },
        data: { reportCoverage: nextReportCoverage(true, isLateSubmission, session.reportCoverage) }
      });
      await createFlagsForReport(tx, created.id);
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ error: "A report has already been submitted for this class session" }, { status: 409 });
    }
    throw error;
  }

  await notifyAbsenceForReport(report.id);
  await recalculateAndFlag(report.courseId);
  return json({ data: report, parsed: sms }, { status: 201 });
}, [Role.CLASS_REP, Role.SUPER_ADMIN]);
