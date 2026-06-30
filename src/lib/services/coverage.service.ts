import { FlagType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSemesterWeek } from "@/lib/utils/semesterWeek";

export type CoverageSummary = {
  totalTopics: number;
  taughtTopics: number;
  expectedByNow: number;
  coveragePercent: number;
  pacingStatus: "On Track" | "Behind" | "Ahead";
};

export class CoverageService {
  async calculate(courseId: string, now = new Date()): Promise<CoverageSummary> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        semester: true,
        outline: { include: { topics: true } },
        reports: {
          where: { isVoided: false },
          include: { topicsCovered: true }
        }
      }
    });
    if (!course?.outline) {
      return { totalTopics: 0, taughtTopics: 0, expectedByNow: 0, coveragePercent: 0, pacingStatus: "Behind" };
    }

    const week = getSemesterWeek(course.semester.startDate, now);
    const totalTopics = course.outline.topics.length;
    const taughtIds = new Set(course.reports.flatMap((report) => report.topicsCovered.map((topic) => topic.topicId)));
    const expectedByNow = course.outline.topics.filter((topic) => (topic.weekNumber ?? 99) <= week).length;
    const taughtTopics = taughtIds.size;
    const coveragePercent = totalTopics === 0 ? 0 : Math.round((taughtTopics / totalTopics) * 100);
    const pacingStatus = taughtTopics < expectedByNow ? "Behind" : taughtTopics > expectedByNow ? "Ahead" : "On Track";
    return { totalTopics, taughtTopics, expectedByNow, coveragePercent, pacingStatus };
  }

  async recalculateAndFlag(courseId: string, now = new Date()) {
    const summary = await this.calculate(courseId, now);
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
        await prisma.flag.create({
          data: {
            lecturerId: course.lecturerId,
            type: FlagType.COVERAGE_LAG,
            message: `${course.code} coverage is ${summary.coveragePercent}% in week ${week}.`
          }
        });
      }
    }
    return summary;
  }
}

export const coverageService = new CoverageService();
