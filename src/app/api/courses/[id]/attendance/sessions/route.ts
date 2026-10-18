import { Role, StudentAttendanceMark } from "@prisma/client";
import { z } from "zod";
import { attendanceManagers } from "@/lib/auth/roles";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  lectureDate: z.coerce.date(),
  scheduleId: z.string().optional(),
  markAllPresent: z.boolean().optional()
});

export const GET = withAuth<Params>(async (_request, { profile, params }) => {
  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({
    where: andWhere({ id: courseId }, courseScope(profile)),
    select: { id: true }
  });
  if (!course) return forbidden("Course not found");
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    include: {
      _count: { select: { records: true } },
      records: { select: { status: true } }
    },
    orderBy: { lectureDate: "desc" }
  });
  return json({
    data: sessions.map((session) => ({
      id: session.id,
      lectureDate: session.lectureDate,
      status: session.status,
      scheduleId: session.scheduleId,
      recordCount: session._count.records,
      presentCount: session.records.filter((r) => r.status === StudentAttendanceMark.PRESENT || r.status === StudentAttendanceMark.LATE).length
    }))
  });
}, attendanceManagers);

export const POST = withAuth<Params>(async (request, { profile, params }) => {
  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({
    where: andWhere({ id: courseId }, courseScope(profile)),
    select: { id: true }
  });
  if (!course) return forbidden("Course not found");
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid session payload", parsed.error.flatten());
  if (parsed.data.scheduleId) {
    const schedule = await prisma.classSchedule.findFirst({ where: { id: parsed.data.scheduleId, courseId }, select: { id: true } });
    if (!schedule) return badRequest("Schedule does not belong to this course");
  }
  const enrollments = await prisma.courseEnrollment.findMany({ where: { courseId }, select: { studentId: true } });
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.attendanceSession.create({
      data: {
        courseId,
        lectureDate: parsed.data.lectureDate,
        scheduleId: parsed.data.scheduleId,
        openedById: profile.id,
        status: "OPEN"
      }
    });
    if (enrollments.length) {
      const status = parsed.data.markAllPresent ? StudentAttendanceMark.PRESENT : StudentAttendanceMark.ABSENT;
      await tx.attendanceRecord.createMany({
        data: enrollments.map((enrollment) => ({
          sessionId: created.id,
          studentId: enrollment.studentId,
          status,
          markedById: profile.id
        }))
      });
    }
    return created;
  });
  return json({ data: session });
}, attendanceManagers);
