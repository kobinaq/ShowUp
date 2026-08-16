import { FlagType, PresenceStatus, ArrivalStatus, DeliveryStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";
import { formatClassTime } from "@/lib/utils/sessionTime";

export async function createFlagsForReport(tx: Prisma.TransactionClient, reportId: string) {
  const report = await tx.lectureReport.findUnique({
    where: { id: reportId },
    include: { schedule: true, course: { include: { lecturer: true, department: { include: { faculty: true } } } } }
  });
  if (!report || report.isVoided) return [];
  const settings = await tx.universitySettings.findUnique({ where: { universityId: report.course.department.faculty.universityId } });
  const repeatThreshold = settings?.flagRepeatThreshold ?? 3;

  const created = [];
  if (report.lecturerPresent === PresenceStatus.ABSENT) {
    created.push(await createFlag(tx, report.course.lecturerId, report.id, FlagType.ABSENCE, `Absent from ${report.course.code}.`));
    await createRepeatedFlagIfNeeded(tx, report.course.lecturerId, report.id, FlagType.ABSENCE, FlagType.REPEATED_ABSENCE, repeatThreshold);
  }
  if (report.arrivalStatus === ArrivalStatus.LATE && report.lateMinutes) {
    created.push(await createFlag(tx, report.course.lecturerId, report.id, FlagType.LATENESS, `Late by ${report.lateMinutes} minutes for ${report.course.code}.`));
    await createRepeatedFlagIfNeeded(tx, report.course.lecturerId, report.id, FlagType.LATENESS, FlagType.REPEATED_LATENESS, repeatThreshold);
  }
  if (report.earlyDismissal && report.dismissedEarlyMinutes) {
    created.push(await createFlag(tx, report.course.lecturerId, report.id, FlagType.EARLY_DISMISSAL, `${report.course.code} ended ${report.dismissedEarlyMinutes} minutes early.`));
  }
  return created;
}

export async function notifyAbsenceForReport(reportId: string) {
  const report = await prisma.lectureReport.findUnique({
    where: { id: reportId },
    include: {
      schedule: true,
      flags: true,
      course: { include: { lecturer: true, department: { include: { faculty: true } } } }
    }
  });
  if (!report || report.isVoided || report.lecturerPresent !== PresenceStatus.ABSENT) return;
  const absenceFlag = report.flags.find((flag) => flag.type === FlagType.ABSENCE);
  if (!absenceFlag) return;
  const settings = await prisma.universitySettings.findUnique({ where: { universityId: report.course.department.faculty.universityId } });
  const delivery = await notificationService.notifyLecturer(
    report.course.lecturer,
    "ShowUp absence report",
    `You were reported absent for your ${report.course.code} class today at ${formatClassTime(report.schedule.startTime)}. Contact your HOD if incorrect. Do not reply to this message.`,
    {
      emailEnabled: settings?.lecturerAbsenceEmailEnabled ?? true,
      smsEnabled: settings?.lecturerAbsenceSmsEnabled ?? true
    }
  );
  if (delivery.email === DeliveryStatus.SENT || delivery.sms === DeliveryStatus.SENT) {
    await prisma.flag.update({ where: { id: absenceFlag.id }, data: { notificationSent: true } });
  }
}

export class FlagService {
  async resolve(flagId: string, internalNotes?: string) {
    return prisma.flag.update({
      where: { id: flagId },
      data: { isResolved: true, internalNotes }
    });
  }
}

export const flagService = new FlagService();

async function createFlag(tx: Prisma.TransactionClient, lecturerId: string, reportId: string, type: FlagType, message: string) {
  return tx.flag.create({ data: { lecturerId, reportId, type, message } });
}

async function createRepeatedFlagIfNeeded(
  tx: Prisma.TransactionClient,
  lecturerId: string,
  reportId: string,
  baseType: FlagType,
  repeatedType: FlagType,
  threshold: number
) {
  const [count, existing] = await Promise.all([
    tx.flag.count({ where: { lecturerId, type: baseType } }),
    tx.flag.findFirst({ where: { lecturerId, type: repeatedType, isResolved: false } })
  ]);
  if (existing || count < threshold) return;
  const label = repeatedType === FlagType.REPEATED_ABSENCE ? "absence" : "lateness";
  await tx.flag.create({
    data: {
      lecturerId,
      reportId,
      type: repeatedType,
      message: `Repeated ${label} threshold reached (${count} reports).`
    }
  });
}
