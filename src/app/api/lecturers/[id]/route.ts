import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { andWhere, departmentScope, lecturerScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest, forbidden } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

const lecturerUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  staffId: z.string().min(2).optional(),
  departmentId: z.string().min(8).optional()
});

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const lecturer = await prisma.lecturer.findFirst({
    where: andWhere({ id }, lecturerScope(profile)),
    include: { department: true, courses: true, flags: true, notifications: true }
  });
  return lecturer ? json({ data: lecturer }) : json({ error: "Not found" }, { status: 404 });
});

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = lecturerUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid lecturer payload", parsed.error.flatten());
  const existing = await prisma.lecturer.findFirst({ where: andWhere({ id }, lecturerScope(profile)), select: { id: true } });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  if (parsed.data.departmentId) {
    const department = await prisma.department.findFirst({ where: andWhere({ id: parsed.data.departmentId }, departmentScope(profile)), select: { id: true } });
    if (!department) return forbidden("Department is outside your scope");
  }
  const lecturer = await prisma.lecturer.update({ where: { id }, data: parsed.data });
  return json({ data: lecturer });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
