import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { importTimetableCsv, timetableManagers } from "@/lib/services/timetable";

const bodySchema = z.object({
  csv: z.string().min(10),
  semesterId: z.string().optional()
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid timetable CSV payload", parsed.error.flatten());

  const semester =
    (parsed.data.semesterId
      ? await prisma.semester.findFirst({
          where: { id: parsed.data.semesterId, universityId: profile.universityId }
        })
      : null) ??
    (await prisma.semester.findFirst({
      where: { universityId: profile.universityId, isActive: true }
    }));
  if (!semester) return badRequest("No active semester found for timetable import");

  const result = await importTimetableCsv({
    universityId: profile.universityId,
    semesterId: semester.id,
    csv: parsed.data.csv,
    actorId: profile.id
  });
  return json({ data: result });
}, timetableManagers);
