import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const departmentId = profile.role === "HOD" || profile.role === "HOD_ASSISTANT" ? profile.departmentId : undefined;
  const reportScope = departmentId ? { course: { departmentId } } : {};
  const lecturerScope = departmentId ? { lecturer: { departmentId } } : {};
  const [reports, absences, lateness, flags, contests] = await Promise.all([
    prisma.lectureReport.count({ where: { ...reportScope, submittedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.lectureReport.count({ where: { ...reportScope, lecturerPresent: "ABSENT" } }),
    prisma.lectureReport.count({ where: { ...reportScope, arrivalStatus: "LATE" } }),
    prisma.flag.count({ where: { ...lecturerScope, isResolved: false } }),
    prisma.contest.count({ where: { status: "PENDING", report: reportScope } })
  ]);
  return json({ data: { reportsThisWeek: reports, absences, lateness, unresolvedFlags: flags, openContests: contests } });
});
