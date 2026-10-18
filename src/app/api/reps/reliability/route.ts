import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { json, withAuth } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const courses = await prisma.course.findMany({
    where: andWhere({}, courseScope(profile)),
    select: { id: true }
  });
  const courseIds = courses.map((c) => c.id);

  const [assignments, flags, noDataSessions] = await Promise.all([
    prisma.repAssignment.findMany({
      where: { courseId: { in: courseIds }, isActive: true },
      include: {
        profile: { select: { id: true, anonymousAlias: true, isActive: true } },
        course: { select: { id: true, code: true, title: true, departmentId: true } }
      },
      orderBy: [{ missedReportCount: "desc" }, { courseId: "asc" }]
    }),
    prisma.repReliabilityFlag.findMany({
      where: { isResolved: false, OR: [{ courseId: { in: courseIds } }, { courseId: null }] },
      include: { profile: { select: { anonymousAlias: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.lectureSession.findMany({
      where: { courseId: { in: courseIds }, reportCoverage: "NO_DATA" },
      include: { course: { select: { code: true, title: true } }, schedule: true },
      orderBy: { lectureDate: "desc" },
      take: 40
    })
  ]);

  return json({
    data: {
      assignments,
      flags,
      noDataSessions,
      note: "NO_DATA means no class-rep report arrived — it is not treated as a missed lecture."
    }
  });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT, Role.HOD, Role.HOD_ASSISTANT]);
