import { prisma } from "@/lib/prisma";
import { flagScope, reportScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const reportsWhere = reportScope(profile);
  const flagsWhere = flagScope(profile);
  const [reports, absences, lateness, flags, contests] = await Promise.all([
    prisma.lectureReport.count({ where: { ...reportsWhere, submittedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.lectureReport.count({ where: { ...reportsWhere, lecturerPresent: "ABSENT" } }),
    prisma.lectureReport.count({ where: { ...reportsWhere, arrivalStatus: "LATE" } }),
    prisma.flag.count({ where: { ...flagsWhere, isResolved: false } }),
    prisma.contest.count({ where: { status: "PENDING", report: reportsWhere } })
  ]);
  return json({ data: { reportsThisWeek: reports, absences, lateness, unresolvedFlags: flags, openContests: contests } });
});
