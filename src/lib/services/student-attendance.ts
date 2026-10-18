import { StudentAttendanceMark, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function attendancePercent(presentLike: number, totalSessions: number) {
  if (totalSessions <= 0) return 100;
  return Math.round((presentLike / totalSessions) * 100);
}

export function isPresentLike(status: StudentAttendanceMark) {
  return status === StudentAttendanceMark.PRESENT || status === StudentAttendanceMark.LATE;
}

export async function courseAttendanceSummary(courseId: string) {
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    select: { id: true, records: { select: { studentId: true, status: true } } }
  });
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: { student: true }
  });
  const totalSessions = sessions.length;
  const byStudent = new Map<string, { presentLike: number; student: (typeof enrollments)[number]["student"] }>();
  for (const enrollment of enrollments) {
    byStudent.set(enrollment.studentId, { presentLike: 0, student: enrollment.student });
  }
  for (const session of sessions) {
    for (const record of session.records) {
      const entry = byStudent.get(record.studentId);
      if (!entry) continue;
      if (isPresentLike(record.status)) entry.presentLike += 1;
    }
  }
  return enrollments.map((enrollment) => {
    const entry = byStudent.get(enrollment.studentId)!;
    return {
      studentId: enrollment.studentId,
      studentNumber: enrollment.student.studentNumber,
      fullName: enrollment.student.fullName,
      email: enrollment.student.email,
      attendancePercent: attendancePercent(entry.presentLike, totalSessions),
      presentLike: entry.presentLike,
      totalSessions
    };
  });
}

export async function syncLowAttendanceFlag(courseId: string, studentId: string, threshold: number) {
  const summary = await courseAttendanceSummary(courseId);
  const row = summary.find((item) => item.studentId === studentId);
  if (!row || row.totalSessions === 0) return null;
  if (row.attendancePercent >= threshold) {
    return prisma.studentAttendanceFlag.updateMany({
      where: { courseId, studentId, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date() }
    });
  }
  return prisma.studentAttendanceFlag.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    create: {
      studentId,
      courseId,
      attendancePercent: row.attendancePercent,
      threshold,
      status: "OPEN"
    },
    update: {
      attendancePercent: row.attendancePercent,
      threshold,
      status: "OPEN",
      resolvedAt: null
    }
  });
}

export async function syncCourseLowAttendanceFlags(courseId: string, universityId: string) {
  const settings = await prisma.universitySettings.findUnique({
    where: { universityId },
    select: { studentAttendanceThreshold: true }
  });
  const threshold = settings?.studentAttendanceThreshold ?? 75;
  const summary = await courseAttendanceSummary(courseId);
  for (const row of summary) {
    if (row.totalSessions === 0) continue;
    if (row.attendancePercent >= threshold) {
      await prisma.studentAttendanceFlag.updateMany({
        where: { courseId, studentId: row.studentId, status: "OPEN" },
        data: { status: "RESOLVED", resolvedAt: new Date() }
      });
    } else {
      await prisma.studentAttendanceFlag.upsert({
        where: { studentId_courseId: { studentId: row.studentId, courseId } },
        create: {
          studentId: row.studentId,
          courseId,
          attendancePercent: row.attendancePercent,
          threshold,
          status: "OPEN"
        },
        update: {
          attendancePercent: row.attendancePercent,
          threshold,
          status: "OPEN",
          resolvedAt: null
        }
      });
    }
  }
  return { threshold, students: summary.length };
}

export function parseStudentCsv(text: string): Array<{ studentNumber: string; fullName: string; email?: string }> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("student") || header.includes("name") || header.includes("email");
  const rows = hasHeader ? lines.slice(1) : lines;
  const parsed: Array<{ studentNumber: string; fullName: string; email?: string }> = [];
  for (const line of rows) {
    const parts = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
    const [studentNumber, fullName, email] = parts;
    if (!studentNumber || !fullName) continue;
    parsed.push({ studentNumber, fullName, email: email || undefined });
  }
  return parsed;
}

export type AttendanceMarkInput = {
  studentId: string;
  status: StudentAttendanceMark;
};

export function buildMarkAllPresent(studentIds: string[]): AttendanceMarkInput[] {
  return studentIds.map((studentId) => ({ studentId, status: StudentAttendanceMark.PRESENT }));
}

export type CourseAccessProfile = {
  id: string;
  role: Prisma.ProfileGetPayload<{ select: { role: true } }>["role"];
  universityId: string;
  departmentId: string | null;
  lecturerId?: string | null;
};
