import {
  LectureSessionStatus,
  SessionDisruptionReason,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLectureSession, isFacilitiesReason } from "@/lib/services/timetable";
import { startOfSessionDay, timeOnSessionDate } from "@/lib/utils/sessionTime";

export async function updateLectureSessionStatus(params: {
  scheduleId: string;
  lectureDate: Date;
  status: LectureSessionStatus;
  reason?: SessionDisruptionReason | null;
  reasonNote?: string | null;
  roomId?: string | null;
  substituteLecturerId?: string | null;
  makeupOfSessionId?: string | null;
  classGroupIds?: string[];
  updatedById?: string;
}) {
  const lectureDate = startOfSessionDay(params.lectureDate);
  return prisma.$transaction(async (tx) => {
    const base = await ensureLectureSession({ scheduleId: params.scheduleId, lectureDate, tx });
    const attributedToFacilities = isFacilitiesReason(params.reason);
    const session = await tx.lectureSession.update({
      where: { id: base.id },
      data: {
        status: params.status,
        reason: params.reason ?? null,
        reasonNote: params.reasonNote ?? null,
        attributedToFacilities,
        roomId: params.roomId === undefined ? undefined : params.roomId,
        substituteLecturerId: params.substituteLecturerId === undefined ? undefined : params.substituteLecturerId,
        makeupOfSessionId: params.makeupOfSessionId === undefined ? undefined : params.makeupOfSessionId,
        updatedById: params.updatedById
      },
      include: {
        room: true,
        substituteLecturer: true,
        classGroups: { include: { classGroup: true } },
        schedule: true,
        course: { include: { lecturer: true, department: true } }
      }
    });

    if (params.classGroupIds) {
      await tx.lectureSessionGroup.deleteMany({ where: { sessionId: session.id } });
      if (params.classGroupIds.length) {
        await tx.lectureSessionGroup.createMany({
          data: params.classGroupIds.map((classGroupId) => ({ sessionId: session.id, classGroupId }))
        });
      }
    }

    return tx.lectureSession.findUniqueOrThrow({
      where: { id: session.id },
      include: {
        room: true,
        substituteLecturer: true,
        classGroups: { include: { classGroup: true } },
        schedule: true,
        course: { include: { lecturer: true, department: true } },
        makeupOfSession: true
      }
    });
  });
}

/** Apply grace window: reporter-claimed lateness below grace does not count as LATE. */
export function applyLateGrace(params: {
  lateMinutes: number | null | undefined;
  graceMinutes: number;
}): { arrivalStatus: "ON_TIME" | "LATE" | null; lateMinutes: number | null } {
  if (params.lateMinutes == null) return { arrivalStatus: null, lateMinutes: null };
  if (params.lateMinutes <= params.graceMinutes) {
    return { arrivalStatus: "ON_TIME", lateMinutes: params.lateMinutes };
  }
  return { arrivalStatus: "LATE", lateMinutes: params.lateMinutes };
}

export function minutesAfterStart(lectureDate: Date, startTime: string, now = new Date()) {
  const start = timeOnSessionDate(lectureDate, startTime);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
}

export async function createMakeupSession(params: {
  originalSessionId: string;
  scheduleId: string;
  lectureDate: Date;
  updatedById?: string;
  substituteLecturerId?: string | null;
  roomId?: string | null;
}) {
  const original = await prisma.lectureSession.findUnique({
    where: { id: params.originalSessionId },
    include: { classGroups: true }
  });
  if (!original) throw new Error("Original session not found");
  const makeup = await updateLectureSessionStatus({
    scheduleId: params.scheduleId,
    lectureDate: params.lectureDate,
    status: LectureSessionStatus.MAKE_UP,
    makeupOfSessionId: original.id,
    substituteLecturerId: params.substituteLecturerId,
    roomId: params.roomId,
    classGroupIds: original.classGroups.map((link) => link.classGroupId),
    updatedById: params.updatedById
  });
  return makeup;
}

export type SessionStatusUpdate = Prisma.LectureSessionGetPayload<{
  include: {
    room: true;
    substituteLecturer: true;
    classGroups: { include: { classGroup: true } };
    schedule: true;
    course: { include: { lecturer: true; department: true } };
    makeupOfSession: true;
  };
}>;
