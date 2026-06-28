import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async () => {
  const [reports, absences, lateness, flags, contests] = await Promise.all([
    prisma.lectureReport.count({ where: { submittedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.lectureReport.count({ where: { lecturerPresent: "ABSENT" } }),
    prisma.lectureReport.count({ where: { arrivalStatus: "LATE" } }),
    prisma.flag.count({ where: { isResolved: false } }),
    prisma.contest.count({ where: { status: "PENDING" } })
  ]);
  return json({ data: { reportsThisWeek: reports, absences, lateness, unresolvedFlags: flags, openContests: contests } });
});
