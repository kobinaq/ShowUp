import { StudentAttendanceMark } from "@prisma/client";
import { z } from "zod";
import { attendanceManagers } from "@/lib/auth/roles";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { timeOnSessionDate } from "@/lib/utils/sessionTime";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { syncCourseLowAttendanceFlags } from "@/lib/services/student-attendance";

type Params = { params: Promise<{ id: string }> };

const markSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.nativeEnum(StudentAttendanceMark)
      })
    )
    .min(1)
    .max(500),
  markAllPresent: z.boolean().optional()
});

export const PUT = withAuth<Params>(async (request, { profile, params }) => {
  const { id: sessionId } = await params;
  const session = await prisma.attendanceSession.findFirst({
    where: andWhere({ id: sessionId }, { course: courseScope(profile) }),
    include: {
      schedule: true,
      course: { select: { id: true, department: { select: { faculty: { select: { universityId: true } } } } } }
    }
  });
  if (!session) return forbidden("Session not found");
  if (session.status === "CLOSED") return badRequest("Session is closed. Re-open it before editing marks.");

  const universityId = session.course.department.faculty.universityId;
  const settings = await prisma.universitySettings.findUnique({ where: { universityId } });
  const editWindowHours = settings?.attendanceEditWindowHours ?? 24;
  if (session.schedule) {
    const classEndAt = timeOnSessionDate(session.lectureDate, session.schedule.endTime);
    const editDeadline = new Date(classEndAt.getTime() + editWindowHours * 60 * 60 * 1000);
    if (new Date() > editDeadline) {
      return forbidden(`Attendance edits close ${editWindowHours}h after class ends`);
    }
  }

  const body = await request.json().catch(() => ({}));
  let marks: Array<{ studentId: string; status: StudentAttendanceMark }> = [];
  if (body.markAllPresent) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: session.courseId },
      select: { studentId: true }
    });
    marks = enrollments.map((row) => ({ studentId: row.studentId, status: StudentAttendanceMark.PRESENT }));
  } else {
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid attendance marks", parsed.error.flatten());
    marks = parsed.data.marks;
  }

  const enrolledIds = new Set(
    (
      await prisma.courseEnrollment.findMany({
        where: { courseId: session.courseId, studentId: { in: marks.map((mark) => mark.studentId) } },
        select: { studentId: true }
      })
    ).map((row) => row.studentId)
  );
  const validMarks = marks.filter((mark) => enrolledIds.has(mark.studentId));
  if (!validMarks.length) return badRequest("No enrolled students matched the marks");

  const existing = await prisma.attendanceRecord.findMany({
    where: { sessionId, studentId: { in: validMarks.map((m) => m.studentId) } }
  });
  const existingByStudent = new Map(existing.map((row) => [row.studentId, row]));

  await prisma.$transaction(async (tx) => {
    for (const mark of validMarks) {
      const prior = existingByStudent.get(mark.studentId);
      const record = await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: mark.studentId } },
        create: {
          sessionId,
          studentId: mark.studentId,
          status: mark.status,
          markedById: profile.id
        },
        update: {
          status: mark.status,
          markedById: profile.id
        }
      });
      if (!prior || prior.status !== mark.status) {
        await tx.attendanceRecordEdit.create({
          data: {
            recordId: record.id,
            fromStatus: prior?.status ?? null,
            toStatus: mark.status,
            editedById: profile.id
          }
        });
      }
    }
    await tx.activityLog.create({
      data: {
        universityId,
        actorId: profile.id,
        action: "attendance.marks_updated",
        metadata: { sessionId, markCount: validMarks.length }
      }
    });
  });

  await syncCourseLowAttendanceFlags(session.course.id, universityId);
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { student: true },
    orderBy: { student: { fullName: "asc" } }
  });
  return json({ data: records });
}, attendanceManagers);
