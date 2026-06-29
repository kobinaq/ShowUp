import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope, departmentScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";
import { createCourseSchema } from "@/lib/validators/course";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: andWhere({ id }, courseScope(profile)),
    include: { lecturer: true, schedule: true, outline: { include: { topics: true } }, reports: true }
  });
  return course ? json({ data: course }) : json({ error: "Not found" }, { status: 404 });
});

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = createCourseSchema.partial({ schedule: true }).safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid course payload", parsed.error.flatten());
  const { schedule: _schedule, ...data } = parsed.data;
  const existing = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true, departmentId: true, semester: { select: { universityId: true } } } });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  const departmentId = data.departmentId ?? existing.departmentId;
  const [department, semester, lecturer] = await Promise.all([
    data.departmentId ? prisma.department.findFirst({ where: andWhere({ id: data.departmentId }, departmentScope(profile)), select: { id: true, faculty: { select: { universityId: true } } } }) : null,
    data.semesterId ? prisma.semester.findUnique({ where: { id: data.semesterId }, select: { universityId: true } }) : null,
    data.lecturerId ? prisma.lecturer.findUnique({ where: { id: data.lecturerId }, select: { departmentId: true } }) : null
  ]);
  if (data.departmentId && !department) return forbidden("Department is outside your scope");
  const universityId = department?.faculty.universityId ?? existing.semester.universityId;
  if (data.semesterId && (!semester || semester.universityId !== universityId)) return badRequest("Semester must belong to the selected university");
  if (data.lecturerId && (!lecturer || lecturer.departmentId !== departmentId)) return badRequest("Lecturer must belong to the selected department");
  const course = await prisma.course.update({ where: { id }, data });
  return json({ data: course });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);

export const DELETE = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  await prisma.course.delete({ where: { id } });
  return json({ ok: true });
}, [Role.SUPER_ADMIN, Role.HOD]);
