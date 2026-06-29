import { FlagType, PresenceStatus, ArrivalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";

export class FlagService {
  async evaluateReport(reportId: string) {
    const report = await prisma.lectureReport.findUnique({
      where: { id: reportId },
      include: { schedule: true, course: { include: { lecturer: true } } }
    });
    if (!report || report.isVoided) return [];

    const created = [];
    if (report.lecturerPresent === PresenceStatus.ABSENT) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.ABSENCE, `Absent from ${report.course.code}.`));
      await notificationService.notifyLecturer(
        report.course.lecturer,
        "ShowUp absence report",
        `You were reported absent for your ${report.course.code} class today at ${formatClassTime(report.schedule.startTime)}. Contact your HOD if incorrect. Do not reply to this message.`
      );
    }
    if (report.arrivalStatus === ArrivalStatus.LATE && report.lateMinutes) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.LATENESS, `Late by ${report.lateMinutes} minutes for ${report.course.code}.`));
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
}

export const flagService = new FlagService();

function formatClassTime(time: string) {
  const [hourText, minuteText] = time.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date.toLocaleTimeString("en", { hour: "numeric", minute: Number(minuteText) ? "2-digit" : undefined, hour12: true }).toLowerCase().replace(" ", "");
}
