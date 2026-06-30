import { ArrivalStatus, PresenceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";
import type { QueryPlan } from "@/types/ask";

type QueryScope = { universityId?: string; departmentId?: string | null };

async function resolveSemesterId(semesterId?: string, scope?: QueryScope) {
  if (semesterId === "active" || !semesterId) {
    return (await prisma.semester.findFirst({ where: { isActive: true, universityId: scope?.universityId }, select: { id: true } }))?.id;
  }
  return semesterId;
}

export async function executeQueryPlan(plan: QueryPlan, scope: QueryScope = {}) {
  const { queryType, params } = plan;
  if (queryType === "unsupported") return [];

  const semesterId = await resolveSemesterId(params.semesterId, scope);
  const limit = params.limit ?? 10;

  switch (queryType) {
    case "lecturer_attendance":
      return lecturerAttendance({ ...params, semesterId, limit }, scope);
    case "topic_coverage":
      return topicCoverage({ ...params, semesterId }, scope);
    case "top_absent":
      return rankedPresence(PresenceStatus.ABSENT, { ...params, semesterId, limit }, scope);
    case "top_late":
      return rankedLateness({ ...params, semesterId, limit }, scope);
    case "flags":
      return flags({ ...params, semesterId, limit }, scope);
    case "coverage_lag":
      return coverageLag({ ...params, semesterId }, scope);
    case "department_summary":
      return departmentSummary({ ...params, semesterId }, scope);
    case "ping_history":
      return pingHistory({ ...params, semesterId, limit }, scope);
  }
}

async function lecturerAttendance(params: QueryPlan["params"] & { semesterId?: string; limit: number }, scope: QueryScope) {
  const lecturers = await prisma.lecturer.findMany({
    where: {
      id: params.lecturerId,
      ...lecturerScope(params, scope),
      courses: params.semesterId ? { some: { semesterId: params.semesterId } } : undefined
    },
    include: {
      department: true,
      courses: {
        where: { semesterId: params.semesterId },
        include: { reports: { where: { isVoided: false } } }
      }
    },
    take: params.limit
  });

  return lecturers.map((lecturer) => {
    const reports = lecturer.courses.flatMap((course) => course.reports);
    const present = reports.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
    const absent = reports.filter((report) => report.lecturerPresent === PresenceStatus.ABSENT).length;
    const late = reports.filter((report) => report.arrivalStatus === ArrivalStatus.LATE).length;
    return {
      lecturerId: lecturer.id,
      lecturer: `${lecturer.firstName} ${lecturer.lastName}`,
      department: lecturer.department.name,
      totalReports: reports.length,
      present,
      absent,
      late,
      attendanceRate: reports.length ? Math.round((present / reports.length) * 100) : 0
    };
  });
}

async function topicCoverage(params: QueryPlan["params"] & { semesterId?: string }, scope: QueryScope) {
  const courses = await prisma.course.findMany({
    where: {
      id: params.courseId,
      ...courseScope(params, scope),
      semesterId: params.semesterId
    },
    include: { lecturer: true, department: true },
    take: 25
  });
  return Promise.all(
    courses.map(async (course) => ({
      courseId: course.id,
      course: course.code,
      title: course.title,
      lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
      department: course.department.name,
      ...(await coverageService.calculate(course.id))
    }))
  );
}

async function rankedPresence(
  presence: PresenceStatus,
  params: QueryPlan["params"] & { semesterId?: string; limit: number },
  scope: QueryScope
) {
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      lecturerPresent: presence,
      isVoided: false,
      course: { semesterId: params.semesterId, ...courseScope(params, scope) }
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: params.limit
  });
  return hydrateCourseCounts(grouped);
}

async function rankedLateness(params: QueryPlan["params"] & { semesterId?: string; limit: number }, scope: QueryScope) {
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      arrivalStatus: ArrivalStatus.LATE,
      isVoided: false,
      course: { semesterId: params.semesterId, ...courseScope(params, scope) }
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: params.limit
  });
  return hydrateCourseCounts(grouped);
}

async function hydrateCourseCounts(grouped: Array<{ courseId: string; _count: { id: number } }>) {
  const courses = await prisma.course.findMany({
    where: { id: { in: grouped.map((item) => item.courseId) } },
    include: { lecturer: true, department: true }
  });
  return grouped.map((item) => {
    const course = courses.find((candidate) => candidate.id === item.courseId);
    return {
      courseId: item.courseId,
      course: course?.code,
      title: course?.title,
      lecturer: course ? `${course.lecturer.firstName} ${course.lecturer.lastName}` : undefined,
      department: course?.department.name,
      count: item._count.id
    };
  });
}

async function flags(params: QueryPlan["params"] & { semesterId?: string; limit: number }, scope: QueryScope) {
  return prisma.flag.findMany({
    where: {
      lecturerId: params.lecturerId,
      type: params.type,
      lecturer: lecturerRelationScope(params, scope),
      report: params.semesterId ? { course: { semesterId: params.semesterId } } : undefined
    },
    include: {
      lecturer: { include: { department: true } },
      report: { include: { course: true } }
    },
    orderBy: { createdAt: "desc" },
    take: params.limit
  });
}

async function coverageLag(params: QueryPlan["params"] & { semesterId?: string }, scope: QueryScope) {
  const threshold = params.threshold ?? 80;
  const coverage = await topicCoverage(params, scope);
  return coverage
    .filter((course) => course.coveragePercent < threshold || course.pacingStatus === "Behind")
    .sort((a, b) => a.coveragePercent - b.coveragePercent);
}

async function departmentSummary(params: QueryPlan["params"] & { semesterId?: string }, scope: QueryScope) {
  const departments = await prisma.department.findMany({
    where: departmentScope(params, scope),
    include: {
      faculty: true,
      courses: {
        where: { semesterId: params.semesterId },
        include: {
          lecturer: true,
          reports: {
            where: { isVoided: false },
            select: {
              lecturerPresent: true,
              arrivalStatus: true,
              flags: { select: { id: true } },
              topicsCovered: { select: { topicId: true } }
            }
          },
          outline: { include: { topics: { select: { id: true } } } }
        }
      }
    }
  });

  return departments.map((department) => {
    const reports = department.courses.flatMap((course) => course.reports);
    const flags = reports.flatMap((report) => report.flags);
    const present = reports.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
    const late = reports.filter((report) => report.arrivalStatus === ArrivalStatus.LATE).length;
    const courseSummaries = department.courses.map((course) => {
      const courseReports = course.reports;
      const coursePresent = courseReports.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
      const taughtTopics = new Set(courseReports.flatMap((report) => report.topicsCovered.map((topic) => topic.topicId))).size;
      const totalTopics = course.outline?.topics.length ?? 0;
      return {
        courseId: course.id,
        course: course.code,
        title: course.title,
        lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
        reports: courseReports.length,
        attendanceRate: courseReports.length ? Math.round((coursePresent / courseReports.length) * 100) : 0,
        flagCount: courseReports.flatMap((report) => report.flags).length,
        coveragePercent: totalTopics ? Math.round((taughtTopics / totalTopics) * 100) : 0
      };
    });
    return {
      departmentId: department.id,
      department: department.name,
      faculty: department.faculty.name,
      courses: department.courses.length,
      reports: reports.length,
      absences: reports.length - present,
      late,
      flags: flags.length,
      attendanceRate: reports.length ? Math.round((present / reports.length) * 100) : 0,
      coursesSummary: courseSummaries
    };
  });
}

async function pingHistory(params: QueryPlan["params"] & { semesterId?: string; limit: number }, scope: QueryScope) {
  const pings = await prisma.latePing.findMany({
    where: {
      course: {
        ...courseScope(params, scope),
        semesterId: params.semesterId,
        lecturerId: params.lecturerId
      }
    },
    include: {
      course: { include: { lecturer: true, department: true } },
      schedule: true
    },
    orderBy: { createdAt: "desc" },
    take: params.limit
  });

  return pings.map((ping) => ({
    pingId: ping.id,
    course: ping.course.code,
    title: ping.course.title,
    lecturer: `${ping.course.lecturer.firstName} ${ping.course.lecturer.lastName}`,
    department: ping.course.department.name,
    lectureDate: ping.lectureDate.toISOString(),
    classTime: `${ping.schedule.startTime}-${ping.schedule.endTime}`,
    minutesLate: ping.minutesLate,
    acknowledged: Boolean(ping.acknowledgedAt),
    acknowledgedAt: ping.acknowledgedAt?.toISOString() ?? null,
    hodNotified: ping.hodNotified
  }));
}

function courseScope(params: QueryPlan["params"], scope: QueryScope) {
  if (scope.departmentId) return { departmentId: scope.departmentId };
  if (scope.universityId) return { department: { faculty: { universityId: scope.universityId } } };
  return params.departmentId ? { departmentId: params.departmentId } : {};
}

function lecturerScope(params: QueryPlan["params"], scope: QueryScope) {
  if (scope.departmentId) return { departmentId: scope.departmentId };
  if (scope.universityId) return { department: { faculty: { universityId: scope.universityId } } };
  return params.departmentId ? { departmentId: params.departmentId } : {};
}

function lecturerRelationScope(params: QueryPlan["params"], scope: QueryScope) {
  if (scope.departmentId) return { departmentId: scope.departmentId };
  if (scope.universityId) return { department: { faculty: { universityId: scope.universityId } } };
  return params.departmentId ? { departmentId: params.departmentId } : undefined;
}

function departmentScope(params: QueryPlan["params"], scope: QueryScope) {
  if (scope.departmentId) return { id: scope.departmentId };
  if (scope.universityId) return { faculty: { universityId: scope.universityId } };
  return params.departmentId ? { id: params.departmentId } : {};
}
