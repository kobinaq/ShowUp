import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { createCourseSchema } from "@/lib/validators/course";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { lecturer: true, schedule: true, outline: { include: { topics: true } }, reports: true }
  });
  return course ? json({ data: course }) : json({ error: "Not found" }, { status: 404 });
});

export const PUT = withAuth<Params>(async (request, { params }) => {
  const parsed = createCourseSchema.partial({ schedule: true }).safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid course payload", parsed.error.flatten());
  const course = await prisma.course.update({ where: { id: params.id }, data: parsed.data });
  return json({ data: course });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);

export const DELETE = withAuth<Params>(async (_request, { params }) => {
  await prisma.course.delete({ where: { id: params.id } });
  return json({ ok: true });
}, [Role.SUPER_ADMIN, Role.HOD]);
