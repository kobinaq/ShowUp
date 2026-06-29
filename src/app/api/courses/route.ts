import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { courseScope, departmentScope, andWhere } from "@/lib/auth/scope";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";
import { createCourseSchema } from "@/lib/validators/course";

export const GET = withAuth(async (_request, { profile }) => {
  const courses = await prisma.course.findMany({
    where: courseScope(profile),
    include: { lecturer: true, department: { include: { faculty: true } }, semester: true, schedule: true, outline: { include: { topics: true } } },
    orderBy: { code: "asc" }
  });
  return json({ data: courses });
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = createCourseSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid course payload", parsed.error.flatten());
  const { schedule, ...data } = parsed.data;
  const [department, semester, lecturer] = await Promise.all([
    prisma.department.findFirst({ where: andWhere({ id: data.departmentId }, departmentScope(profile)), select: { id: true, faculty: { select: { universityId: true } } } }),
    prisma.semester.findUnique({ where: { id: data.semesterId }, select: { universityId: true } }),
    prisma.lecturer.findUnique({ where: { id: data.lecturerId }, select: { departmentId: true } })
  ]);
  if (!department) return forbidden("Department is outside your scope");
  if (!semester || semester.universityId !== department.faculty.universityId) return badRequest("Semester must belong to the selected university");
  if (!lecturer || lecturer.departmentId !== data.departmentId) return badRequest("Lecturer must belong to the selected department");
  const course = await prisma.course.create({
    data: { ...data, schedule: { create: schedule } },
    include: { schedule: true }
  });
  return json({ data: course }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
