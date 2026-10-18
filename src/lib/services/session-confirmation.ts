import { DiscrepancyKind, PresenceStatus, ReportDiscrepancyStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { confirmationDisagrees } from "@/lib/services/rep-reliability";

export const sessionConfirmRoles: Role[] = [
  Role.LECTURER,
  Role.HOD,
  Role.HOD_ASSISTANT,
  Role.SUPER_ADMIN,
  Role.QA_OFFICER,
  Role.QA_ASSISTANT
];

export async function confirmLectureSession(input: {
  lectureSessionId: string;
  confirmedById: string;
  presence: PresenceStatus;
  note?: string | null;
}) {
  const session = await prisma.lectureSession.findUnique({
    where: { id: input.lectureSessionId },
    include: {
      reports: { where: { isVoided: false }, orderBy: { submittedAt: "asc" } }
    }
  });
  if (!session) return { error: "Session not found" as const };

  const confirmation = await prisma.sessionConfirmation.upsert({
    where: { lectureSessionId: session.id },
    create: {
      lectureSessionId: session.id,
      confirmedById: input.confirmedById,
      presence: input.presence,
      note: input.note ?? null
    },
    update: {
      confirmedById: input.confirmedById,
      presence: input.presence,
      note: input.note ?? null,
      confirmedAt: new Date()
    }
  });

  const peerReport = session.reports[0];
  let discrepancy = null;
  if (peerReport && confirmationDisagrees(peerReport.lecturerPresent, input.presence)) {
    discrepancy = await prisma.reportDiscrepancy.upsert({
      where: {
        scheduleId_lectureDate: { scheduleId: session.scheduleId, lectureDate: session.lectureDate }
      },
      create: {
        courseId: session.courseId,
        scheduleId: session.scheduleId,
        lectureDate: session.lectureDate,
        kind: DiscrepancyKind.LECTURER_CONFIRMATION,
        firstReportId: peerReport.id,
        secondReportId: null,
        confirmationId: confirmation.id,
        status: ReportDiscrepancyStatus.OPEN
      },
      update: {
        kind: DiscrepancyKind.LECTURER_CONFIRMATION,
        confirmationId: confirmation.id,
        status: ReportDiscrepancyStatus.OPEN,
        resolvedAt: null,
        resolvedById: null,
        resolutionNote: null
      }
    });
  }

  return { confirmation, discrepancy, session };
}
