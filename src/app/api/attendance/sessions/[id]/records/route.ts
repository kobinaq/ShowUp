import { StudentAttendanceMark } from "@prisma/client";
import { z } from "zod";
import { attendanceManagers } from "@/lib/auth/roles";
import { andWhere, courseScope } from "@/lib/auth/scope";
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
      course: { select: { id: true, department: { select: { faculty: { select: { universityId: true } } } } } }
    }
  });
  if (!session) return forbidden("Session not found");
  if (session.status === "CLOSED") return badRequest("Session is closed. Re-open it before editing marks.");

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

  await prisma.$transaction(
    validMarks.map((mark) =>
      prisma.attendanceRecord.upsert({
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
      })
    )
  );

  await syncCourseLowAttendanceFlags(session.course.id, session.course.department.faculty.universityId);
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { student: true },
    orderBy: { student: { fullName: "asc" } }
  });
  return json({ data: records });
}, attendanceManagers);
