import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, departmentScope, lecturerScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";
import { z } from "zod";

const lecturerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  staffId: z.string().min(2),
  departmentId: z.string().min(8)
});

export const GET = withAuth(async (_request, { profile }) => {
  const lecturers = await prisma.lecturer.findMany({ where: lecturerScope(profile), include: { department: true, courses: true, flags: true }, orderBy: { lastName: "asc" } });
  return json({ data: lecturers });
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = lecturerSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid lecturer payload", parsed.error.flatten());
  const department = await prisma.department.findFirst({ where: andWhere({ id: parsed.data.departmentId }, departmentScope(profile)), select: { id: true } });
  if (!department) return forbidden("Department is outside your scope");
  const lecturer = await prisma.lecturer.create({ data: parsed.data });
  return json({ data: lecturer }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.IT]);
