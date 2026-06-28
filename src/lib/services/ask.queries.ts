import { ArrivalStatus, PresenceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";
import type { QueryPlan } from "@/types/ask";

async function resolveSemesterId(semesterId?: string) {
  if (semesterId === "active" || !semesterId) {
    return (await prisma.semester.findFirst({ where: { isActive: true }, select: { id: true } }))?.id;
  }
  return semesterId;
}

export async function executeQueryPlan(plan: QueryPlan) {
  const { queryType, params } = plan;
  if (queryType === "unsupported") return [];

  const semesterId = await resolveSemesterId(params.semesterId);
  const limit = params.limit ?? 10;

  switch (queryType) {
    case "lecturer_attendance":
      return lecturerAttendance({ ...params, semesterId, limit });
    case "topic_coverage":
      return topicCoverage({ ...params, semesterId });
    case "top_absent":
      return rankedPresence(PresenceStatus.ABSENT, { ...params, semesterId, limit });
    case "top_late":
      return rankedLateness({ ...params, semesterId, limit });
    case "flags":
      return flags({ ...params, semesterId, limit });
    case "coverage_lag":
      return coverageLag({ ...params, semesterId });
    case "department_summary":
      return departmentSummary({ ...params, semesterId });
  }
}

async function lecturerAttendance(params: QueryPlan["params"] & { semesterId?: string; limit: number }) {
  const lecturers = await prisma.lecturer.findMany({
    where: {
      id: params.lecturerId,
      departmentId: params.departmentId,
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

async function topicCoverage(params: QueryPlan["params"] & { semesterId?: string }) {
  const courses = await prisma.course.findMany({
    where: {
      id: params.courseId,
      departmentId: params.departmentId,
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
  params: QueryPlan["params"] & { semesterId?: string; limit: number }
) {
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      lecturerPresent: presence,
      isVoided: false,
      course: { semesterId: params.semesterId, departmentId: params.departmentId }
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: params.limit
  });
  return hydrateCourseCounts(grouped);
}

async function rankedLateness(params: QueryPlan["params"] & { semesterId?: string; limit: number }) {
  const grouped = await prisma.lectureReport.groupBy({
    by: ["courseId"],
    where: {
      arrivalStatus: ArrivalStatus.LATE,
      isVoided: false,
      course: { semesterId: params.semesterId, departmentId: params.departmentId }
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

async function flags(params: QueryPlan["params"] & { semesterId?: string; limit: number }) {
  return prisma.flag.findMany({
    where: {
      lecturerId: params.lecturerId,
      type: params.type,
      lecturer: { departmentId: params.departmentId },
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

async function coverageLag(params: QueryPlan["params"] & { semesterId?: string }) {
  const threshold = params.threshold ?? 80;
  const coverage = await topicCoverage(params);
  return coverage
    .filter((course) => course.coveragePercent < threshold || course.pacingStatus === "Behind")
    .sort((a, b) => a.coveragePercent - b.coveragePercent);
}

async function departmentSummary(params: QueryPlan["params"] & { semesterId?: string }) {
  const departments = await prisma.department.findMany({
    where: { id: params.departmentId },
    include: {
      faculty: true,
      courses: {
        where: { semesterId: params.semesterId },
        include: {
          lecturer: true,
          reports: { where: { isVoided: false }, include: { flags: true } }
        }
      }
    }
  });

  return departments.map((department) => {
    const reports = department.courses.flatMap((course) => course.reports);
    const flags = reports.flatMap((report) => report.flags);
    const present = reports.filter((report) => report.lecturerPresent !== PresenceStatus.ABSENT).length;
    const late = reports.filter((report) => report.arrivalStatus === ArrivalStatus.LATE).length;
    return {
      departmentId: department.id,
      department: department.name,
      faculty: department.faculty.name,
      courses: department.courses.length,
      reports: reports.length,
      absences: reports.length - present,
      late,
      flags: flags.length,
      attendanceRate: reports.length ? Math.round((present / reports.length) * 100) : 0
    };
  });
}
