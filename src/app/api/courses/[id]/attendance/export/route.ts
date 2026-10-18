import { attendanceManagers } from "@/lib/auth/roles";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { forbidden, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { courseAttendanceSummary } from "@/lib/services/student-attendance";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { profile, params }) => {
  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({
    where: andWhere({ id: courseId }, courseScope(profile)),
    select: { id: true, code: true }
  });
  if (!course) return forbidden("Course not found");
  const summary = await courseAttendanceSummary(courseId);
  const header = "student_number,full_name,email,present_or_late,total_sessions,attendance_percent\n";
  const rows = summary
    .map((row) =>
      [row.studentNumber, row.fullName, row.email ?? "", row.presentLike, row.totalSessions, row.attendancePercent]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
  return new Response(header + rows + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${course.code}-student-attendance.csv"`
    }
  });
}, attendanceManagers);
