import { prisma } from "@/lib/prisma";
import { startOfSessionDay } from "@/lib/utils/sessionTime";

export async function recomputeDailySummaries(reference = new Date()) {
  const day = startOfSessionDay(reference);
  const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  const universities = await prisma.university.findMany({ select: { id: true } });
  let rows = 0;

  for (const university of universities) {
    const settings = await prisma.universitySettings.findUnique({ where: { universityId: university.id } });
    if (settings && settings.dailySummaryEnabled === false) continue;

    const departments = await prisma.department.findMany({
      where: { faculty: { universityId: university.id } },
      select: { id: true, facultyId: true }
    });

    // University-wide rollup
    rows += await writeSummaryGrain({
      universityId: university.id,
      facultyId: null,
      departmentId: null,
      day,
      next
    });

    for (const dept of departments) {
      rows += await writeSummaryGrain({
        universityId: university.id,
        facultyId: dept.facultyId,
        departmentId: dept.id,
        day,
        next
      });
    }
  }
  return { rows, day };
}

async function writeSummaryGrain(input: {
  universityId: string;
  facultyId: string | null;
  departmentId: string | null;
  day: Date;
  next: Date;
}) {
  const courseWhere = {
    department: {
      faculty: { universityId: input.universityId },
      ...(input.facultyId ? { facultyId: input.facultyId } : {}),
      ...(input.departmentId ? { id: input.departmentId } : {})
    }
  };

  const [reportCount, presentCount, absentCount, lateCount, unresolvedFlags, openContests, pingCount, pingAckCount, noDataSessions, courseCount] =
    await Promise.all([
      prisma.lectureReport.count({ where: { isVoided: false, lectureDate: { gte: input.day, lt: input.next }, course: courseWhere } }),
      prisma.lectureReport.count({
        where: { isVoided: false, lectureDate: { gte: input.day, lt: input.next }, course: courseWhere, lecturerPresent: "PRESENT" }
      }),
      prisma.lectureReport.count({
        where: { isVoided: false, lectureDate: { gte: input.day, lt: input.next }, course: courseWhere, lecturerPresent: "ABSENT" }
      }),
      prisma.lectureReport.count({
        where: { isVoided: false, lectureDate: { gte: input.day, lt: input.next }, course: courseWhere, arrivalStatus: "LATE" }
      }),
      prisma.flag.count({
        where: {
          isResolved: false,
          createdAt: { gte: input.day, lt: input.next },
          lecturer: { department: courseWhere.department }
        }
      }),
      prisma.contest.count({
        where: {
          status: "PENDING",
          raisedAt: { gte: input.day, lt: input.next },
          report: { course: courseWhere }
        }
      }),
      prisma.latePing.count({ where: { lectureDate: { gte: input.day, lt: input.next }, course: courseWhere } }),
      prisma.latePing.count({
        where: { lectureDate: { gte: input.day, lt: input.next }, course: courseWhere, acknowledgedAt: { not: null } }
      }),
      prisma.lectureSession.count({
        where: { lectureDate: { gte: input.day, lt: input.next }, reportCoverage: "NO_DATA", course: courseWhere }
      }),
      prisma.course.count({ where: courseWhere })
    ]);

  await prisma.dailyQualitySummary.deleteMany({
    where: {
      universityId: input.universityId,
      facultyId: input.facultyId,
      departmentId: input.departmentId,
      summaryDate: input.day
    }
  });
  await prisma.dailyQualitySummary.create({
    data: {
      universityId: input.universityId,
      facultyId: input.facultyId,
      departmentId: input.departmentId,
      summaryDate: input.day,
      reportCount,
      presentCount,
      absentCount,
      lateCount,
      unresolvedFlags,
      openContests,
      pingCount,
      pingAckCount,
      noDataSessions,
      courseCount
    }
  });
  return 1;
}
