import { BlackoutType, Role } from "@prisma/client";
import { z } from "zod";
import { departmentScope } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { timetableManagers } from "@/lib/services/timetable";
import { startOfSessionDay } from "@/lib/utils/sessionTime";

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const blackouts = await prisma.academicBlackout.findMany({
    where: {
      universityId: profile.universityId,
      ...(from || to
        ? {
            AND: [
              ...(from ? [{ endDate: { gte: startOfSessionDay(new Date(from)) } }] : []),
              ...(to ? [{ startDate: { lte: startOfSessionDay(new Date(to)) } }] : [])
            ]
          }
        : {}),
      OR:
        profile.role === Role.HOD || profile.role === Role.HOD_ASSISTANT
          ? [{ departmentId: null }, { departmentId: profile.departmentId ?? "__none__" }]
          : undefined
    },
    include: { department: true },
    orderBy: { startDate: "asc" },
    take: 200
  });
  return json({ data: blackouts });
}, [...timetableManagers, Role.VC, Role.LECTURER]);

const createSchema = z
  .object({
    type: z.nativeEnum(BlackoutType),
    title: z.string().min(2).max(200),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    departmentId: z.string().nullable().optional(),
    suppressesFlags: z.boolean().default(true)
  })
  .refine((value) => value.endDate >= value.startDate, { message: "endDate must be on or after startDate" });

export const POST = withAuth(async (request, { profile }) => {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid blackout payload", parsed.error.flatten());

  if (parsed.data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: parsed.data.departmentId, ...departmentScope(profile) }
    });
    if (!department) return forbidden("Department is outside your scope");
  } else if (profile.role === Role.HOD || profile.role === Role.HOD_ASSISTANT) {
    return badRequest("HOD blackouts must target a department, or ask QA/IT for university-wide");
  }

  const blackout = await prisma.academicBlackout.create({
    data: {
      universityId: profile.universityId,
      departmentId: parsed.data.departmentId ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      startDate: startOfSessionDay(parsed.data.startDate),
      endDate: startOfSessionDay(parsed.data.endDate),
      suppressesFlags: parsed.data.suppressesFlags
    },
    include: { department: true }
  });
  return json({ data: blackout });
}, timetableManagers);

export const DELETE = withAuth(async (request, { profile }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("id is required");
  const existing = await prisma.academicBlackout.findFirst({
    where: { id, universityId: profile.universityId }
  });
  if (!existing) return forbidden("Blackout not found");
  await prisma.academicBlackout.delete({ where: { id: existing.id } });
  return json({ data: { id: existing.id, deleted: true } });
}, timetableManagers);
