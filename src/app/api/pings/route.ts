import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfSessionDay } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { sendLatePing } from "@/lib/services/ping.service";

const pingSchema = z.object({
  courseId: z.string().min(3),
  scheduleId: z.string().min(3),
  lectureDate: z.coerce.date()
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = pingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid ping payload", parsed.error.flatten());

  const assignment = await prisma.repAssignment.findFirst({
    where: { courseId: parsed.data.courseId, profileId: profile.id, isActive: true }
  });
  if (!assignment) return forbidden("Class reps can only ping assigned active courses");

  const result = await sendLatePing(parsed.data.courseId, parsed.data.scheduleId, profile.id, startOfSessionDay(parsed.data.lectureDate), profile.universityId);
  if (!result.success) return badRequest(result.error);
  return json({ data: result.ping }, { status: 201 });
}, [Role.CLASS_REP]);
