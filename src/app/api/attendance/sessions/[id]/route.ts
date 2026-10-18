import { andWhere, courseScope } from "@/lib/auth/scope";
import { attendanceManagers } from "@/lib/auth/roles";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { syncCourseLowAttendanceFlags } from "@/lib/services/student-attendance";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { profile, params }) => {
  const { id } = await params;
  const session = await prisma.attendanceSession.findFirst({
    where: { id, course: courseScope(profile) },
    include: {
      course: { select: { id: true, code: true, title: true, department: { select: { faculty: { select: { universityId: true } } } } } },
      records: {
        include: { student: true },
        orderBy: { student: { fullName: "asc" } }
      }
    }
  });
  if (!session) return forbidden("Session not found");
  return json({ data: session });
}, attendanceManagers);

export const PATCH = withAuth<Params>(async (request, { profile, params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const session = await prisma.attendanceSession.findFirst({
    where: andWhere({ id }, { course: courseScope(profile) }),
    include: { course: { select: { id: true, department: { select: { faculty: { select: { universityId: true } } } } } } }
  });
  if (!session) return forbidden("Session not found");
  if (body.status === "CLOSED") {
    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() }
    });
    await syncCourseLowAttendanceFlags(session.course.id, session.course.department.faculty.universityId);
    return json({ data: updated });
  }
  if (body.status === "OPEN") {
    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: { status: "OPEN", closedAt: null }
    });
    return json({ data: updated });
  }
  return badRequest("Unsupported session update");
}, attendanceManagers);
