import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { timetableManagers } from "@/lib/services/timetable";

export const GET = withAuth(async (_request, { profile }) => {
  const rooms = await prisma.room.findMany({
    where: { universityId: profile.universityId },
    include: {
      _count: {
        select: {
          facilitiesIssues: { where: { status: "OPEN" } },
          sessions: true,
          schedules: true
        }
      }
    },
    orderBy: [{ building: "asc" }, { code: "asc" }]
  });
  return json({ data: rooms });
}, [...timetableManagers, Role.LECTURER, Role.VC, Role.CLASS_REP]);

const upsertSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  building: z.string().max(120).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(2000).nullable().optional(),
  isActive: z.boolean().optional()
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = upsertSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid room payload", parsed.error.flatten());
  const room = await prisma.room.upsert({
    where: {
      universityId_code: { universityId: profile.universityId, code: parsed.data.code }
    },
    create: {
      universityId: profile.universityId,
      code: parsed.data.code,
      name: parsed.data.name,
      building: parsed.data.building ?? null,
      capacity: parsed.data.capacity ?? null
    },
    update: {
      name: parsed.data.name,
      building: parsed.data.building ?? null,
      capacity: parsed.data.capacity ?? null,
      isActive: parsed.data.isActive ?? true
    }
  });
  return json({ data: room });
}, timetableManagers);
