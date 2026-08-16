import { ArrivalStatus, PresenceStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  courseScope as authCourseScope,
  departmentScope as authDepartmentScope,
  lecturerScope as authLecturerScope,
  type ScopedProfile
} from "@/lib/auth/scope";
import { coverageService } from "@/lib/services/coverage.service";
import type { QueryPlan } from "@/types/ask";

async function resolveSemesterId(semesterId?: string, profile?: ScopedProfile) {
  if (semesterId === "active" || !semesterId) {
    return (
      await prisma.semester.findFirst({
        where: { isActive: true, universityId: profile?.role === Role.SUPER_ADMIN ? undefined : profile?.universityId },
        select: { id: true }
      })
    )?.id;
  }
  return semesterId;
}

export async function executeQueryPlan(plan: QueryPlan, profile?: ScopedProfile) {
  const { queryType, params } = plan;
  if (queryType === "unsupported") return [];

  const semesterId = await resolveSemesterId(params.semesterId, profile);
  const limit = params.limit ?? 10;

  switch (queryType) {
    case "lecturer_attendance":
      return lecturerAttendance({ ...params, semesterId, limit }, profile);
    case "topic_coverage":
      return topicCoverage({ ...params, semesterId }, profile);
    case "top_absent":
      return rankedPresence(PresenceStatus.ABSENT, { ...params, semesterId, limit }, profile);
    case "top_late":
      return rankedLateness({ ...params, semesterId, limit }, profile);
    case "flags":
      return flags({ ...params, semesterId, limit }, profile);
    case "coverage_lag":
      return coverageLag({ ...params, semesterId }, profile);
    case "department_summary":
      return departmentSummary({ ...params, semesterId }, profile);
    case "ping_history":
      return pingHistory({ ...params, semesterId, limit }, profile);
  }
}

async function lecturerAttendance(params: QueryPlan["params"] & { semesterId?: string; limit: number }, profile?: ScopedProfile) {
  const lecturers = await prisma.lecturer.findMany({
    where: {
      id: params.lecturerId,
      ...queryLecturerScope(profile, params),
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

async function topicCoverage(params: QueryPlan["params"] & { semesterId?: string }, profile?: ScopedProfile) {
  const courses = await prisma.course.findMany({
    where: {
      id: params.courseId,
      ...queryCourseScope(profile, params),
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
  profile?: ScopedProfile
) {
  const take = params.threshold ? Math.max(params.limit * 3, 25) : params.limit;
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      lecturerPresent: presence,
      isVoided: false,
      course: { semesterId: params.semesterId, ...queryCourseScope(profile, params) }
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take
  });
  const hydrated = await hydrateCourseCounts(grouped);
  return applyCountThreshold(hydrated, params.threshold).slice(0, params.limit);
}

async function rankedLateness(params: QueryPlan["params"] & { semesterId?: string; limit: number }, profile?: ScopedProfile) {
  const take = params.threshold ? Math.max(params.limit * 3, 25) : params.limit;
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      arrivalStatus: ArrivalStatus.LATE,
      isVoided: false,
      course: { semesterId: params.semesterId, ...queryCourseScope(profile, params) }
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take
  });
  const hydrated = await hydrateCourseCounts(grouped);
  return applyCountThreshold(hydrated, params.threshold).slice(0, params.limit);
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

function applyCountThreshold<T extends { count: number }>(items: T[], threshold?: number) {
  return typeof threshold === "number" ? items.filter((item) => item.count > threshold) : items;
}

async function flags(params: QueryPlan["params"] & { semesterId?: string; limit: number }, profile?: ScopedProfile) {
  return prisma.flag.findMany({
    where: {
      lecturerId: params.lecturerId,
      type: params.type,
      lecturer: queryLecturerScope(profile, params),
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

async function coverageLag(params: QueryPlan["params"] & { semesterId?: string }, profile?: ScopedProfile) {
  const threshold = params.threshold ?? 80;
  const coverage = await topicCoverage(params, profile);
  return coverage
    .filter((course) => course.coveragePercent < threshold || course.pacingStatus === "Behind")
    .sort((a, b) => a.coveragePercent - b.coveragePercent);
}

async function departmentSummary(params: QueryPlan["params"] & { semesterId?: string }, profile?: ScopedProfile) {
  const departments = await prisma.department.findMany({
    where: queryDepartmentScope(profile, params),
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

async function pingHistory(params: QueryPlan["params"] & { semesterId?: string; limit: number }, profile?: ScopedProfile) {
  const pings = await prisma.latePing.findMany({
    where: {
      course: {
        ...queryCourseScope(profile, params),
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

function queryCourseScope(profile: ScopedProfile | undefined, params: QueryPlan["params"]) {
  if (profile && profile.role !== Role.SUPER_ADMIN) return authCourseScope(profile);
  return params.departmentId ? { departmentId: params.departmentId } : {};
}

function queryLecturerScope(profile: ScopedProfile | undefined, params: QueryPlan["params"]) {
  if (profile && profile.role !== Role.SUPER_ADMIN) return authLecturerScope(profile);
  return params.departmentId ? { departmentId: params.departmentId } : {};
}

function queryDepartmentScope(profile: ScopedProfile | undefined, params: QueryPlan["params"]) {
  if (profile && profile.role !== Role.SUPER_ADMIN) return authDepartmentScope(profile);
  return params.departmentId ? { id: params.departmentId } : {};
}
