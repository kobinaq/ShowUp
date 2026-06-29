import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("university"),
    name: z.string().min(2).max(160),
    address: z.string().max(240).optional()
  }),
  z.object({
    type: z.literal("faculty"),
    name: z.string().min(2).max(160),
    universityId: z.string().min(3)
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
    universityId: z.string().min(3),
    isActive: z.boolean().default(true)
  }),
  z.object({
    type: z.literal("lecturer"),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
    staffId: z.string().min(2),
    departmentId: z.string().min(3)
  }),
  z.object({
    type: z.literal("course"),
    code: z.string().min(2).max(20),
    title: z.string().min(3).max(160),
    departmentId: z.string().min(3),
    semesterId: z.string().min(3),
    lecturerId: z.string().min(3),
    creditHours: z.coerce.number().int().min(1).max(6),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    venue: z.string().max(120).optional()
  })
]);

export const POST = withAuth(async (request, { profile }) => {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid setup payload", parsed.error.flatten());

  const data = parsed.data;
  if (data.type === "university") {
    const created = await prisma.university.create({ data: { name: data.name, address: data.address } });
    return json({ data: created }, { status: 201 });
  }
  if (data.type === "faculty") {
    const created = await prisma.faculty.create({ data: { name: data.name, universityId: data.universityId } });
    return json({ data: created }, { status: 201 });
  }
  if (data.type === "department") {
    const created = await prisma.department.create({ data: { name: data.name, facultyId: data.facultyId } });
    return json({ data: created }, { status: 201 });
  }
  if (data.type === "semester") {
    if (data.isActive) await prisma.semester.updateMany({ where: { universityId: data.universityId }, data: { isActive: false } });
    const created = await prisma.semester.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        universityId: data.universityId
      }
    });
    return json({ data: created }, { status: 201 });
  }
  if (data.type === "lecturer") {
    const departmentId = profile.role === Role.SUPER_ADMIN ? data.departmentId : profile.departmentId;
    if (!departmentId) return badRequest("Department is required");
    const created = await prisma.lecturer.create({
      data: { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, staffId: data.staffId, departmentId }
    });
    return json({ data: created }, { status: 201 });
  }

  const departmentId = profile.role === Role.SUPER_ADMIN ? data.departmentId : profile.departmentId;
  if (!departmentId) return badRequest("Department is required");
  const created = await prisma.course.create({
    data: {
      code: data.code,
      title: data.title,
      departmentId,
      semesterId: data.semesterId,
      lecturerId: data.lecturerId,
      creditHours: data.creditHours,
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
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
