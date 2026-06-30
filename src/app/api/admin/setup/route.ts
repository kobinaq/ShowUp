import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("university"),
    name: z.string().min(2).max(160),
    address: z.string().max(240).optional()
  }),
  z.object({
    type: z.literal("faculty"),
    name: z.string().min(2).max(160),
    universityId: z.string().min(3).optional()
  }),
  z.object({
    type: z.literal("department"),
    name: z.string().min(2).max(160),
    facultyId: z.string().min(3)
  }),
  z.object({
    type: z.literal("semester"),
    name: z.string().min(4).max(120),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    universityId: z.string().min(3).optional(),
    isActive: z.boolean().default(true)
  }),
  z.object({
    type: z.literal("lecturer"),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
    staffId: z.string().min(2),
    departmentId: z.string().min(3).optional()
  }),
  z.object({
    type: z.literal("course"),
    code: z.string().min(2).max(20),
    title: z.string().min(3).max(160),
    departmentId: z.string().min(3).optional(),
    semesterId: z.string().min(3),
    lecturerId: z.string().min(3),
    creditHours: z.coerce.number().int().min(1).max(6),
    classSize: z.coerce.number().int().min(1).max(2000),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    venue: z.string().max(120).optional()
  })
]);

const universityScopedRoles: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT];
const departmentScopedRoles: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT];
type DepartmentResolution = { departmentId: string } | { response: Response };

export const POST = withAuth(async (request, { profile }): Promise<Response> => {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid setup payload", parsed.error.flatten());
  if (profile.role === Role.VC) return forbidden("Vice Chancellor admin is read-only for now.");

  const data = parsed.data;
  const isSuperAdmin = profile.role === Role.SUPER_ADMIN;
  const isQa = profile.role === Role.QA_OFFICER || profile.role === Role.QA_ASSISTANT;
  const isDepartmentRole = profile.role === Role.HOD || profile.role === Role.HOD_ASSISTANT;

  if (data.type === "university") {
    if (!isSuperAdmin) return forbidden("Only platform administrators can create universities.");
    const created = await prisma.university.create({ data: { name: data.name, address: data.address } });
    return json({ data: created }, { status: 201 });
  }

  if (data.type === "faculty") {
    if (!universityScopedRoles.includes(profile.role)) return forbidden("You cannot create faculties for this role.");
    const universityId = isSuperAdmin ? data.universityId : profile.universityId;
    if (!universityId) return badRequest("University is required");
    const created = await prisma.faculty.create({ data: { name: data.name, universityId } });
    return json({ data: created }, { status: 201 });
  }

  if (data.type === "department") {
    if (!universityScopedRoles.includes(profile.role)) return forbidden("You cannot create departments for this role.");
    const faculty = await prisma.faculty.findUnique({ where: { id: data.facultyId }, select: { id: true, universityId: true } });
    if (!faculty) return badRequest("Faculty was not found");
    if (!isSuperAdmin && faculty.universityId !== profile.universityId) return forbidden("Faculty is outside your university.");
    const created = await prisma.department.create({ data: { name: data.name, facultyId: faculty.id } });
    return json({ data: created }, { status: 201 });
  }

  if (data.type === "semester") {
    if (!universityScopedRoles.includes(profile.role)) return forbidden("You cannot create semesters for this role.");
    const universityId = isSuperAdmin ? data.universityId : profile.universityId;
    if (!universityId) return badRequest("University is required");
    if (data.isActive) await prisma.semester.updateMany({ where: { universityId }, data: { isActive: false } });
    const created = await prisma.semester.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        universityId
      }
    });
    return json({ data: created }, { status: 201 });
  }

  if (data.type === "lecturer") {
    if (!departmentScopedRoles.includes(profile.role)) return forbidden("You cannot create lecturers for this role.");
    const resolved = await resolveDepartmentId(data.departmentId, profile, isSuperAdmin, isQa, isDepartmentRole);
    if ("response" in resolved) return resolved.response;
    const created = await prisma.lecturer.create({
      data: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, staffId: data.staffId, departmentId: resolved.departmentId }
    });
    return json({ data: created }, { status: 201 });
  }

  if (data.type === "course") {
    if (!departmentScopedRoles.includes(profile.role)) return forbidden("You cannot create courses for this role.");
    const resolved = await resolveDepartmentId(data.departmentId, profile, isSuperAdmin, isQa, isDepartmentRole);
    if ("response" in resolved) return resolved.response;
    const { departmentId } = resolved;
    const [semester, lecturer] = await Promise.all([
      prisma.semester.findUnique({ where: { id: data.semesterId }, select: { id: true, universityId: true } }),
      prisma.lecturer.findUnique({ where: { id: data.lecturerId }, select: { id: true, departmentId: true } })
    ]);
    if (!semester) return badRequest("Semester was not found");
    if (!isSuperAdmin && semester.universityId !== profile.universityId) return forbidden("Semester is outside your university.");
    if (!lecturer || lecturer.departmentId !== departmentId) return badRequest("Lecturer must belong to the selected department.");

    const created = await prisma.course.create({
      data: {
        code: data.code,
        title: data.title,
        departmentId,
        semesterId: semester.id,
        lecturerId: lecturer.id,
        creditHours: data.creditHours,
        classSize: data.classSize,
        schedule: {
          create: {
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            venue: data.venue
          }
        }
      },
      include: { schedule: true }
    });
    return json({ data: created }, { status: 201 });
  }

  return badRequest("Unsupported setup type");
}, [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT]);

async function resolveDepartmentId(
  submittedDepartmentId: string | undefined,
  profile: { role: Role; universityId: string; departmentId: string | null },
  isSuperAdmin: boolean,
  isQa: boolean,
  isDepartmentRole: boolean
): Promise<DepartmentResolution> {
  const departmentId = isDepartmentRole ? profile.departmentId : submittedDepartmentId;
  if (!departmentId) return { response: badRequest("Department is required") };
  if (isSuperAdmin) return { departmentId };

  if (isQa) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, faculty: { universityId: profile.universityId } },
      select: { id: true }
    });
    if (!department) return { response: forbidden("Department is outside your university.") };
    return { departmentId: department.id };
  }

  if (departmentId !== profile.departmentId) return { response: forbidden("Department is outside your scope.") };
  return { departmentId };
}
