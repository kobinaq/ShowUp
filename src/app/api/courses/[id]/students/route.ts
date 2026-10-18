import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { attendanceManagers } from "@/lib/auth/roles";
import { courseAttendanceSummary, parseStudentCsv, syncCourseLowAttendanceFlags } from "@/lib/services/student-attendance";

type Params = { params: Promise<{ id: string }> };

const studentSchema = z.object({
  studentNumber: z.string().trim().min(2).max(64),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal(""))
});

const csvSchema = z.object({
  csv: z.string().min(1).max(500_000)
});

async function loadManagedCourse(
  courseId: string,
  profile: { id: string; role: Role; universityId: string; departmentId: string | null; lecturerId: string | null }
) {
  return prisma.course.findFirst({
    where: andWhere({ id: courseId }, courseScope(profile)),
    select: {
      id: true,
      code: true,
      lecturerId: true,
      department: { select: { faculty: { select: { universityId: true } } } }
    }
  });
}

export const GET = withAuth<Params>(async (_request, { profile, params }) => {
  const { id: courseId } = await params;
  const course = await loadManagedCourse(courseId, profile);
  if (!course) return forbidden("Course not found");
  const [enrollments, summary, flags] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { courseId },
      include: { student: true },
      orderBy: { student: { fullName: "asc" } }
    }),
    courseAttendanceSummary(courseId),
    prisma.studentAttendanceFlag.findMany({ where: { courseId, status: "OPEN" } })
  ]);
  const percentByStudent = new Map(summary.map((row) => [row.studentId, row]));
  return json({
    data: {
      courseId,
      enrollmentCount: enrollments.length,
      students: enrollments.map((row) => ({
        id: row.student.id,
        studentNumber: row.student.studentNumber,
        fullName: row.student.fullName,
        email: row.student.email,
        attendancePercent: percentByStudent.get(row.student.id)?.attendancePercent ?? null,
        presentLike: percentByStudent.get(row.student.id)?.presentLike ?? 0,
        totalSessions: percentByStudent.get(row.student.id)?.totalSessions ?? 0,
        lowAttendance: flags.some((flag) => flag.studentId === row.student.id)
      })),
      openLowAttendanceFlags: flags.length
    }
  });
}, attendanceManagers);

export const POST = withAuth<Params>(async (request, { profile, params }) => {
  const { id: courseId } = await params;
  const course = await loadManagedCourse(courseId, profile);
  if (!course) return forbidden("Course not found");
  const universityId = course.department.faculty.universityId;
  const body = await request.json().catch(() => ({}));

  if (typeof body.csv === "string") {
    const parsed = csvSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid CSV payload", parsed.error.flatten());
    const rows = parseStudentCsv(parsed.data.csv);
    if (!rows.length) return badRequest("No valid student rows found");
    let imported = 0;
    for (const row of rows) {
      const student = await prisma.student.upsert({
        where: { universityId_studentNumber: { universityId, studentNumber: row.studentNumber } },
        create: {
          universityId,
          studentNumber: row.studentNumber,
          fullName: row.fullName,
          email: row.email
        },
        update: {
          fullName: row.fullName,
          email: row.email ?? undefined
        }
      });
      await prisma.courseEnrollment.upsert({
        where: { courseId_studentId: { courseId, studentId: student.id } },
        create: { courseId, studentId: student.id },
        update: {}
      });
      imported += 1;
    }
    await syncCourseLowAttendanceFlags(courseId, universityId);
    return json({ data: { imported } });
  }

  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid student payload", parsed.error.flatten());
  const student = await prisma.student.upsert({
    where: { universityId_studentNumber: { universityId, studentNumber: parsed.data.studentNumber } },
    create: {
      universityId,
      studentNumber: parsed.data.studentNumber,
      fullName: parsed.data.fullName,
      email: parsed.data.email || null
    },
    update: {
      fullName: parsed.data.fullName,
      email: parsed.data.email || null
    }
  });
  await prisma.courseEnrollment.upsert({
    where: { courseId_studentId: { courseId, studentId: student.id } },
    create: { courseId, studentId: student.id },
    update: {}
  });
  return json({ data: student });
}, attendanceManagers);
