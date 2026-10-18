import { FacilitiesIssueStatus, Role, SessionDisruptionReason } from "@prisma/client";
import { z } from "zod";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import { isFacilitiesReason, timetableManagers } from "@/lib/services/timetable";
import { updateLectureSessionStatus } from "@/lib/services/session-status";
import { LectureSessionStatus } from "@prisma/client";

const reporters: Role[] = [...timetableManagers, Role.LECTURER, Role.CLASS_REP, Role.VC];

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as FacilitiesIssueStatus | null;
  const roomId = url.searchParams.get("roomId");
  const issues = await prisma.facilitiesIssue.findMany({
    where: {
      universityId: profile.universityId,
      ...(status ? { status } : {}),
      ...(roomId ? { roomId } : {})
    },
    include: {
      room: true,
      reportedBy: { select: { id: true, displayName: true, role: true } },
      session: { include: { course: true, schedule: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const problemRooms = await prisma.room.findMany({
    where: {
      universityId: profile.universityId,
      facilitiesIssues: { some: { status: FacilitiesIssueStatus.OPEN } }
    },
    include: {
      facilitiesIssues: {
        where: { status: FacilitiesIssueStatus.OPEN },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      _count: { select: { facilitiesIssues: true } }
    },
    orderBy: { code: "asc" }
  });

  return json({ data: { issues, problemRooms } });
}, reporters);

const createSchema = z.object({
  roomId: z.string().min(1),
  category: z.nativeEnum(SessionDisruptionReason),
  description: z.string().min(4).max(1000),
  scheduleId: z.string().optional(),
  lectureDate: z.coerce.date().optional(),
  markSessionDelayed: z.boolean().default(true)
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid facilities issue", parsed.error.flatten());
  if (!isFacilitiesReason(parsed.data.category) && parsed.data.category !== SessionDisruptionReason.OTHER) {
    return badRequest("Use a facilities-related reason (room not ready, power/projector, university event, or other)");
  }

  const room = await prisma.room.findFirst({
    where: { id: parsed.data.roomId, universityId: profile.universityId }
  });
  if (!room) return forbidden("Room is outside your university");

  let sessionId: string | undefined;
  if (parsed.data.scheduleId && parsed.data.lectureDate) {
    const schedule = await prisma.classSchedule.findFirst({
      where: {
        id: parsed.data.scheduleId,
        course: { department: { faculty: { universityId: profile.universityId } } }
      }
    });
    if (!schedule) return forbidden("Schedule is outside your scope");
    if (parsed.data.markSessionDelayed) {
      const session = await updateLectureSessionStatus({
        scheduleId: schedule.id,
        lectureDate: parsed.data.lectureDate,
        status: LectureSessionStatus.DELAYED,
        reason: parsed.data.category,
        reasonNote: parsed.data.description,
        roomId: room.id,
        updatedById: profile.id
      });
      sessionId = session.id;
    }
  }

  const issue = await prisma.facilitiesIssue.create({
    data: {
      universityId: profile.universityId,
      roomId: room.id,
      sessionId,
      reportedById: profile.id,
      category: parsed.data.category,
      description: parsed.data.description
    },
    include: { room: true, session: true }
  });
  return json({ data: issue });
}, reporters);

const resolveSchema = z.object({
  id: z.string().min(1),
  status: z.literal(FacilitiesIssueStatus.RESOLVED)
});

export const PATCH = withAuth(async (request, { profile }) => {
  const parsed = resolveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid resolve payload", parsed.error.flatten());
  const existing = await prisma.facilitiesIssue.findFirst({
    where: { id: parsed.data.id, universityId: profile.universityId }
  });
  if (!existing) return forbidden("Issue not found");
  const issue = await prisma.facilitiesIssue.update({
    where: { id: existing.id },
    data: { status: FacilitiesIssueStatus.RESOLVED, resolvedAt: new Date() },
    include: { room: true }
  });
  return json({ data: issue });
}, timetableManagers);
