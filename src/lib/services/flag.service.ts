import { FlagType, PresenceStatus, ArrivalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";

export class FlagService {
  async evaluateReport(reportId: string) {
    const report = await prisma.lectureReport.findUnique({
      where: { id: reportId },
      include: { schedule: true, course: { include: { lecturer: true, department: { include: { faculty: true } } } } }
    });
    if (!report || report.isVoided) return [];
    const settings = await prisma.universitySettings.findUnique({ where: { universityId: report.course.department.faculty.universityId } });
    const repeatThreshold = settings?.flagRepeatThreshold ?? 3;

    const created = [];
    if (report.lecturerPresent === PresenceStatus.ABSENT) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.ABSENCE, `Absent from ${report.course.code}.`));
      await this.createRepeatedFlagIfNeeded(report.course.lecturerId, report.id, FlagType.ABSENCE, FlagType.REPEATED_ABSENCE, repeatThreshold);
      await notificationService.notifyLecturer(
        report.course.lecturer,
        "ShowUp absence report",
        `You were reported absent for your ${report.course.code} class today at ${formatClassTime(report.schedule.startTime)}. Contact your HOD if incorrect. Do not reply to this message.`,
        {
          emailEnabled: settings?.lecturerAbsenceEmailEnabled ?? true,
          smsEnabled: settings?.lecturerAbsenceSmsEnabled ?? true
        }
      );
    }
    if (report.arrivalStatus === ArrivalStatus.LATE && report.lateMinutes) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.LATENESS, `Late by ${report.lateMinutes} minutes for ${report.course.code}.`));
      await this.createRepeatedFlagIfNeeded(report.course.lecturerId, report.id, FlagType.LATENESS, FlagType.REPEATED_LATENESS, repeatThreshold);
    }
    if (report.earlyDismissal && report.dismissedEarlyMinutes) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.EARLY_DISMISSAL, `${report.course.code} ended ${report.dismissedEarlyMinutes} minutes early.`));
    }
    return created;
  }

  async resolve(flagId: string, internalNotes?: string) {
    return prisma.flag.update({
      where: { id: flagId },
      data: { isResolved: true, internalNotes }
    });
  }

  private async create(lecturerId: string, reportId: string, type: FlagType, message: string) {
    return prisma.flag.create({ data: { lecturerId, reportId, type, message } });
  }

  private async createRepeatedFlagIfNeeded(lecturerId: string, reportId: string, baseType: FlagType, repeatedType: FlagType, threshold: number) {
    const [count, existing] = await Promise.all([
      prisma.flag.count({ where: { lecturerId, type: baseType } }),
      prisma.flag.findFirst({ where: { lecturerId, type: repeatedType, isResolved: false } })
    ]);
    if (existing || count < threshold) return;
    const label = repeatedType === FlagType.REPEATED_ABSENCE ? "absence" : "lateness";
    await prisma.flag.create({
      data: {
        lecturerId,
        reportId,
        type: repeatedType,
        message: `Repeated ${label} threshold reached (${count} reports).`
      }
    });
  }
}

export const flagService = new FlagService();

function formatClassTime(time: string) {
  const [hourText, minuteText] = time.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date.toLocaleTimeString("en", { hour: "numeric", minute: Number(minuteText) ? "2-digit" : undefined, hour12: true }).toLowerCase().replace(" ", "");
}
