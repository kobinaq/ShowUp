import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { createCourseSchema } from "@/lib/validators/course";

export const GET = withAuth(async (_request, { profile }) => {
  const where = profile.departmentId && !["SUPER_ADMIN", "VC", "QA_OFFICER"].includes(profile.role)
    ? { departmentId: profile.departmentId }
    : {};
  const courses = await prisma.course.findMany({
    where,
    include: { lecturer: true, department: { include: { faculty: true } }, semester: true, schedule: true, outline: { include: { topics: true } } },
    orderBy: { code: "asc" }
  });
  return json({ data: courses });
});

export const POST = withAuth(async (request) => {
  const parsed = createCourseSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid course payload", parsed.error.flatten());
  const { schedule, ...data } = parsed.data;
  const course = await prisma.course.create({
    data: { ...data, schedule: { create: schedule } },
    include: { schedule: true }
  });
  return json({ data: course }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
