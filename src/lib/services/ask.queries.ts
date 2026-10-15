import { ArrivalStatus, PresenceStatus, Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  courseScope as authCourseScope,
  departmentScope as authDepartmentScope,
  lecturerScope as authLecturerScope,
  type ScopedProfile
} from "@/lib/auth/scope";
import { explicitAskWindow, resolveAskWindow, type AskWindow } from "@/lib/services/ask.period";
import { calculateCoverage, summarizeCoverage, type CoverageSummary } from "@/lib/services/coverage.service";
import type { QueryPlan } from "@/types/ask";

type SemesterRow = { id: string; name: string; startDate: Date; endDate: Date; universityId: string };
type ResolvedQuery = { semesterId?: string; window: AskWindow; now: Date };

export async function executeQueryPlan(plan: QueryPlan, profile?: ScopedProfile, now = new Date()) {
  const { queryType, params } = plan;
  if (queryType === "unsupported" || params.period === "unrecognized") return [];

  const resolved = await resolveQuery(params, profile, now);
  if (!resolved) return [];
  const limit = params.limit ?? 10;

  switch (queryType) {
    case "lecturer_attendance":
      return lecturerAttendance({ ...params, ...resolved, limit }, profile);
    case "topic_coverage":
      return topicCoverage({ ...params, ...resolved }, profile);
    case "top_absent":
      return rankedPresence(PresenceStatus.ABSENT, { ...params, ...resolved, limit }, profile);
    case "top_late":
      return rankedLateness({ ...params, ...resolved, limit }, profile);
    case "flags":
      return flags({ ...params, ...resolved, limit }, profile);
    case "coverage_lag":
      return coverageLag({ ...params, ...resolved }, profile);
    case "department_summary":
      return departmentSummary({ ...params, ...resolved }, profile);
    case "ping_history":
      return pingHistory({ ...params, ...resolved, limit }, profile);
  }
}

async function resolveQuery(params: QueryPlan["params"], profile: ScopedProfile | undefined, now: Date): Promise<ResolvedQuery | null> {
  const explicit = params.period ? null : explicitAskWindow(params.from, params.to);
  if (explicit) return { window: explicit, now };

  const period = params.period ?? "semester";
  if (period === "year") {
    return { window: resolveAskWindow("year", now), now };
  }

  const active = await findActiveSemester(params.semesterId, profile);
  if (period === "previous_semester") {
    const previous = await findPreviousSemester(active, profile);
    if (!previous) return null;
    return { semesterId: previous.id, window: resolveAskWindow("semester", now, previous), now };
  }

  const window = resolveAskWindow(period, now, active);
  const semesterId = params.semesterId && params.semesterId !== "active" ? params.semesterId : active?.id;
  return { semesterId, window, now };
}

async function findActiveSemester(semesterId: string | undefined, profile?: ScopedProfile) {
  if (semesterId && semesterId !== "active") {
    return prisma.semester.findFirst({
      where: {
        id: semesterId,
        ...(profile && profile.role !== Role.SUPER_ADMIN ? { universityId: profile.universityId } : {})
      },
      select: { id: true, name: true, startDate: true, endDate: true, universityId: true }
    });
  }
  return prisma.semester.findFirst({
    where: { isActive: true, universityId: profile && profile.role !== Role.SUPER_ADMIN ? profile.universityId : undefined },
    select: { id: true, name: true, startDate: true, endDate: true, universityId: true }
  });
}

async function findPreviousSemester(active: SemesterRow | null, profile?: ScopedProfile) {
  const universityId = active?.universityId ?? (profile && profile.role !== Role.SUPER_ADMIN ? profile.universityId : undefined);
  return prisma.semester.findFirst({
    where: {
      ...(universityId ? { universityId } : {}),
      ...(active ? { id: { not: active.id }, endDate: { lte: active.startDate } } : { isActive: false })
    },
    orderBy: { endDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true, universityId: true }
  });
}

function lectureDateFilter(window: AskWindow): { lectureDate?: { gte: Date; lte: Date } } {
  if (!window.from || !window.to) return {};
  return { lectureDate: { gte: window.from, lte: window.to } };
}

function withPeriod<T extends object>(rows: T[], label: string) {
  return rows.map((row) => ({ ...row, period: label }));
}

async function lecturerAttendance(params: QueryPlan["params"] & ResolvedQuery & { limit: number }, profile?: ScopedProfile) {
  const lecturers = await prisma.lecturer.findMany({
    where: {
      id: params.lecturerId,
      ...queryLecturerScope(profile, params),
      courses: params.semesterId ? { some: { semesterId: params.semesterId } } : undefined
    },
    include: {
      department: true,
      courses: {
        where: params.semesterId ? { semesterId: params.semesterId } : undefined,
        include: { reports: { where: { isVoided: false, ...lectureDateFilter(params.window) } } }
      }
    },
    take: params.limit
  });

  return withPeriod(
    lecturers.map((lecturer) => {
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
    }),
    params.window.label
  );
}

async function topicCoverage(params: QueryPlan["params"] & ResolvedQuery, profile?: ScopedProfile) {
  const courses = await prisma.course.findMany({
    where: {
      id: params.courseId,
      ...queryCourseScope(profile, params),
      ...(params.semesterId ? { semesterId: params.semesterId } : {})
    },
    include: { lecturer: true, department: true },
    take: 25
  });
  const coverageWindow = params.window.from && params.window.to ? { from: params.window.from, to: params.window.to } : null;
  return withPeriod(
    await Promise.all(
      courses.map(async (course) => ({
        courseId: course.id,
        course: course.code,
        title: course.title,
        lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
        department: course.department.name,
        ...(await calculateCoverage(course.id, params.now, coverageWindow))
      }))
    ),
    params.window.label
  );
}

async function rankedPresence(
  presence: PresenceStatus,
  params: QueryPlan["params"] & ResolvedQuery & { limit: number },
  profile?: ScopedProfile
) {
  const take = params.threshold ? Math.max(params.limit * 3, 25) : params.limit;
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      lecturerPresent: presence,
      isVoided: false,
      ...lectureDateFilter(params.window),
      course: courseWhere(params, profile)
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take
  });
  const hydrated = await hydrateCourseCounts(grouped);
  return withPeriod(applyCountThreshold(hydrated, params.threshold).slice(0, params.limit), params.window.label);
}

async function rankedLateness(params: QueryPlan["params"] & ResolvedQuery & { limit: number }, profile?: ScopedProfile) {
  const take = params.threshold ? Math.max(params.limit * 3, 25) : params.limit;
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      arrivalStatus: ArrivalStatus.LATE,
      isVoided: false,
      ...lectureDateFilter(params.window),
      course: courseWhere(params, profile)
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take
  });
  const hydrated = await hydrateCourseCounts(grouped);
  return withPeriod(applyCountThreshold(hydrated, params.threshold).slice(0, params.limit), params.window.label);
}

function courseWhere(params: QueryPlan["params"] & ResolvedQuery, profile?: ScopedProfile): Prisma.CourseWhereInput {
  return {
    ...(params.semesterId ? { semesterId: params.semesterId } : {}),
    ...queryCourseScope(profile, params)
  };
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

async function flags(params: QueryPlan["params"] & ResolvedQuery & { limit: number }, profile?: ScopedProfile) {
  const rows = await prisma.flag.findMany({
    where: {
      lecturerId: params.lecturerId,
      type: params.type,
      lecturer: queryLecturerScope(profile, params),
      ...(params.window.from && params.window.to ? { createdAt: { gte: params.window.from, lte: params.window.to } } : {}),
      ...(params.semesterId ? { report: { course: { semesterId: params.semesterId } } } : {})
    },
    include: {
      lecturer: { include: { department: true } },
      report: { include: { course: true } }
    },
    orderBy: { createdAt: "desc" },
    take: params.limit
  });
  return withPeriod(rows, params.window.label);
}

function behindInPeriod(course: CoverageSummary) {
  return (
    typeof course.topicsScheduledInPeriod === "number" &&
    course.topicsScheduledInPeriod > 0 &&
    (course.scheduledTopicsTaughtInPeriod ?? 0) < course.topicsScheduledInPeriod
  );
}

async function coverageLag(params: QueryPlan["params"] & ResolvedQuery, profile?: ScopedProfile) {
  const threshold = params.threshold ?? 80;
  const coverage = await topicCoverage(params, profile);
  return coverage
    .filter((course) => course.coveragePercent < threshold || course.pacingStatus === "Behind" || behindInPeriod(course))
    .sort((a, b) => a.coveragePercent - b.coveragePercent);
}

async function departmentSummary(params: QueryPlan["params"] & ResolvedQuery, profile?: ScopedProfile) {
  const departments = await prisma.department.findMany({
    where: queryDepartmentScope(profile, params),
    include: {
      faculty: true,
      courses: {
        where: params.semesterId ? { semesterId: params.semesterId } : undefined,
        include: {
          lecturer: true,
          semester: { select: { startDate: true } },
          reports: {
            where: {
              isVoided: false,
              ...(params.window.to ? { lectureDate: { lte: params.window.to } } : {})
            },
            select: {
              lectureDate: true,
              lecturerPresent: true,
              arrivalStatus: true,
              flags: { select: { id: true } },
              topicsCovered: { select: { topicId: true } }
            }
          },
          outline: { include: { topics: { select: { id: true, weekNumber: true } } } }
        }
      }
    }
  });

  return withPeriod(
    departments.map((department) => {
      const reports = department.courses.flatMap((course) => course.reports);
      const inWindow = reports.filter((report) => inAskWindow(report.lectureDate, params.window));
      const flags = inWindow.flatMap((report) => report.flags);
      const present = inWindow.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
      const late = inWindow.filter((report) => report.arrivalStatus === ArrivalStatus.LATE).length;
      const coverageWindow = params.window.from && params.window.to ? { from: params.window.from, to: params.window.to } : null;
      const courseSummaries = department.courses.map((course) => {
        const courseReports = course.reports.filter((report) => inAskWindow(report.lectureDate, params.window));
        const coursePresent = courseReports.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
        const coverage = summarizeCoverage({
          semesterStart: course.semester.startDate,
          topics: course.outline?.topics ?? [],
          reports: course.reports.map((report) => ({
            lectureDate: report.lectureDate,
            topicIds: report.topicsCovered.map((topic) => topic.topicId)
          })),
          now: params.now,
          window: coverageWindow
        });
        return {
          courseId: course.id,
          course: course.code,
          title: course.title,
          lecturer: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
          reports: courseReports.length,
          attendanceRate: courseReports.length ? Math.round((coursePresent / courseReports.length) * 100) : 0,
          flagCount: courseReports.flatMap((report) => report.flags).length,
          coveragePercent: coverage.coveragePercent,
          topicsReportedInPeriod: coverage.topicsReportedInPeriod
        };
      });
      return {
        departmentId: department.id,
        department: department.name,
        faculty: department.faculty.name,
        courses: department.courses.length,
        reports: inWindow.length,
        absences: inWindow.length - present,
        late,
        flags: flags.length,
        attendanceRate: inWindow.length ? Math.round((present / inWindow.length) * 100) : 0,
        coursesSummary: courseSummaries
      };
    }),
    params.window.label
  );
}

function inAskWindow(lectureDate: Date, window: AskWindow) {
  if (!window.from || !window.to) return true;
  return lectureDate >= window.from && lectureDate <= window.to;
}

async function pingHistory(params: QueryPlan["params"] & ResolvedQuery & { limit: number }, profile?: ScopedProfile) {
  const pings = await prisma.latePing.findMany({
    where: {
      ...lectureDateFilter(params.window),
      course: {
        ...queryCourseScope(profile, params),
        ...(params.semesterId ? { semesterId: params.semesterId } : {}),
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

  return withPeriod(
    pings.map((ping) => ({
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
    })),
    params.window.label
  );
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
