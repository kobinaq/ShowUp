import { FlagType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { flagEventForCreate } from "@/lib/services/flag-events";
import { getSemesterWeek } from "@/lib/utils/semesterWeek";

export type CoverageWindow = { from: Date; to: Date };

export type CoverageSummary = {
  totalTopics: number;
  taughtTopics: number;
  expectedByNow: number;
  coveragePercent: number;
  pacingStatus: "On Track" | "Behind" | "Ahead";
  topicsScheduledInPeriod?: number;
  scheduledTopicsTaughtInPeriod?: number;
  topicsReportedInPeriod?: number;
};

export function summarizeCoverage(input: {
  semesterStart: Date;
  topics: Array<{ id: string; weekNumber: number | null }>;
  reports: Array<{ lectureDate: Date; topicIds: string[] }>;
  now?: Date;
  window?: CoverageWindow | null;
}): CoverageSummary {
  const now = input.now ?? new Date();
  const window = input.window ?? null;
  const asOf = window?.to && window.to < now ? window.to : now;
  const week = getSemesterWeek(input.semesterStart, asOf);
  const reportsToDate = window ? input.reports.filter((report) => report.lectureDate <= asOf) : input.reports;
  const taughtIds = new Set(reportsToDate.flatMap((report) => report.topicIds));
  const totalTopics = input.topics.length;
  const expectedByNow = input.topics.filter((topic) => (topic.weekNumber ?? 99) <= week).length;
  const taughtTopics = taughtIds.size;
  const coveragePercent = totalTopics === 0 ? 0 : Math.round((taughtTopics / totalTopics) * 100);
  const pacingStatus = taughtTopics < expectedByNow ? "Behind" : taughtTopics > expectedByNow ? "Ahead" : "On Track";
  const summary: CoverageSummary = { totalTopics, taughtTopics, expectedByNow, coveragePercent, pacingStatus };
  if (!window?.from || !window.to) return summary;

  const periodEnd = window.to < now ? window.to : now;
  const periodReports = input.reports.filter((report) => report.lectureDate >= window.from && report.lectureDate <= periodEnd);
  const fromWeek = Math.max(1, getSemesterWeek(input.semesterStart, window.from));
  const toWeek = getSemesterWeek(input.semesterStart, asOf);
  const scheduled = input.topics.filter((topic) => {
    const weekNumber = topic.weekNumber ?? 99;
    return weekNumber >= fromWeek && weekNumber <= toWeek;
  });
  summary.topicsScheduledInPeriod = scheduled.length;
  summary.scheduledTopicsTaughtInPeriod = scheduled.filter((topic) => taughtIds.has(topic.id)).length;
  summary.topicsReportedInPeriod = new Set(periodReports.flatMap((report) => report.topicIds)).size;
  return summary;
}

export async function calculateCoverage(courseId: string, now = new Date(), window?: CoverageWindow | null): Promise<CoverageSummary> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      semester: true,
      outline: { include: { topics: true } },
      reports: {
        where: {
          isVoided: false,
          ...(window?.to ? { lectureDate: { lte: window.to } } : {})
        },
        include: { topicsCovered: true }
      }
    }
  });
  if (!course?.outline) {
    return { totalTopics: 0, taughtTopics: 0, expectedByNow: 0, coveragePercent: 0, pacingStatus: "Behind" };
  }

  return summarizeCoverage({
    semesterStart: course.semester.startDate,
    topics: course.outline.topics,
    reports: course.reports.map((report) => ({
      lectureDate: report.lectureDate,
      topicIds: report.topicsCovered.map((topic) => topic.topicId)
    })),
    now,
    window
  });
}

export async function recalculateAndFlag(courseId: string, now = new Date()) {
  const summary = await calculateCoverage(courseId, now);
  const course = await prisma.course.findUnique({ where: { id: courseId }, include: { semester: true, lecturer: true, department: { include: { faculty: true } } } });
  if (!course) return summary;
  const week = getSemesterWeek(course.semester.startDate, now);
  const settings = await prisma.universitySettings.findUnique({ where: { universityId: course.department.faculty.universityId } });
  const week6 = settings?.flagCoverageWeek6 ?? Number(process.env.FLAG_COVERAGE_THRESHOLD_WEEK6 ?? 60);
  const week10 = settings?.flagCoverageWeek10 ?? Number(process.env.FLAG_COVERAGE_THRESHOLD_WEEK10 ?? 80);
  const shouldFlag = (week >= 6 && summary.coveragePercent < week6) || (week >= 10 && summary.coveragePercent < week10);
  if (shouldFlag) {
    const existing = await prisma.flag.findFirst({
      where: { lecturerId: course.lecturerId, type: FlagType.COVERAGE_LAG, isResolved: false }
    });
    if (!existing) {
      const flag = await prisma.flag.create({
        data: {
          lecturerId: course.lecturerId,
          type: FlagType.COVERAGE_LAG,
          message: `${course.code} coverage is ${summary.coveragePercent}% in week ${week}.`
        }
      });
      await prisma.flagEvent.create({ data: { flagId: flag.id, ...flagEventForCreate() } });
    }
  }
  return summary;
}
