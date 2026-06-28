import { FlagType, PresenceStatus, ArrivalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";

export class FlagService {
  async evaluateReport(reportId: string) {
    const report = await prisma.lectureReport.findUnique({
      where: { id: reportId },
      include: { course: { include: { lecturer: true } } }
    });
    if (!report || report.isVoided) return [];

    const created = [];
    if (report.lecturerPresent === PresenceStatus.ABSENT) {
      created.push(await this.create(report.course.lecturerId, report.id, FlagType.ABSENCE, `Absent from ${report.course.code}.`));
      await notificationService.notifyLecturer(
        report.course.lecturer,
        "ShowUp absence report",
        `You were reported absent for ${report.course.code} on ${report.lectureDate.toDateString()}. Contact your HOD if incorrect.`
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
