import { LectureSessionStatus, Role, SessionDisruptionReason } from "@prisma/client";
import { z } from "zod";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { createMakeupSession, updateLectureSessionStatus } from "@/lib/services/session-status";
import { ensureLectureSession, timetableManagers } from "@/lib/services/timetable";
import { startOfSessionDay } from "@/lib/utils/sessionTime";
// andWhere used by POST/PUT course scoping

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");
  const courseId = url.searchParams.get("courseId");

  const sessions = await prisma.lectureSession.findMany({
    where: {
      course: courseScope(profile),
      ...(courseId ? { courseId } : {}),
      ...(status ? { status: status as LectureSessionStatus } : {}),
      ...(from || to
        ? {
            lectureDate: {
              ...(from ? { gte: startOfSessionDay(new Date(from)) } : {}),
              ...(to ? { lte: startOfSessionDay(new Date(to)) } : {})
            }
          }
        : {})
    },
    include: {
      course: { include: { lecturer: true, department: true } },
      schedule: true,
      room: true,
      substituteLecturer: true,
      classGroups: { include: { classGroup: true } },
      makeupOfSession: true,
      facilitiesIssues: true
    },
    orderBy: [{ lectureDate: "asc" }, { createdAt: "asc" }],
    take: 200
  });
  return json({ data: sessions });
}, [...timetableManagers, Role.LECTURER, Role.VC]);

const upsertSchema = z.object({
  scheduleId: z.string().min(1),
  lectureDate: z.coerce.date(),
  status: z.nativeEnum(LectureSessionStatus),
  reason: z.nativeEnum(SessionDisruptionReason).nullable().optional(),
  reasonNote: z.string().max(500).nullable().optional(),
  roomId: z.string().nullable().optional(),
  substituteLecturerId: z.string().nullable().optional(),
  makeupOfSessionId: z.string().nullable().optional(),
  classGroupIds: z.array(z.string()).optional()
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = upsertSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid session payload", parsed.error.flatten());

  const schedule = await prisma.classSchedule.findFirst({
    where: andWhere({ id: parsed.data.scheduleId }, { course: courseScope(profile) }),
    include: { course: true }
  });
  if (!schedule) return forbidden("Schedule is outside your scope");

  if (parsed.data.status === LectureSessionStatus.MAKE_UP && parsed.data.makeupOfSessionId) {
    const makeup = await createMakeupSession({
      originalSessionId: parsed.data.makeupOfSessionId,
      scheduleId: parsed.data.scheduleId,
      lectureDate: parsed.data.lectureDate,
      updatedById: profile.id,
      substituteLecturerId: parsed.data.substituteLecturerId,
      roomId: parsed.data.roomId
    });
    return json({ data: makeup });
  }

  const session = await updateLectureSessionStatus({
    ...parsed.data,
    updatedById: profile.id
  });
  return json({ data: session });
}, timetableManagers);

export const PUT = withAuth(async (request, { profile }) => {
  const body = z
    .object({
      scheduleId: z.string(),
      lectureDate: z.coerce.date()
    })
    .safeParse(await request.json().catch(() => ({})));
  if (!body.success) return badRequest("scheduleId and lectureDate required", body.error.flatten());
  const schedule = await prisma.classSchedule.findFirst({
    where: andWhere({ id: body.data.scheduleId }, { course: courseScope(profile) })
  });
  if (!schedule) return forbidden("Schedule is outside your scope");
  const session = await ensureLectureSession({
    scheduleId: body.data.scheduleId,
    lectureDate: body.data.lectureDate
  });
  return json({ data: session });
}, [...timetableManagers, Role.LECTURER, Role.CLASS_REP]);
