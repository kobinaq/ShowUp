import {
  DeliveryStatus,
  NotificationChannel,
  RepDutyRole,
  RepNotificationKind,
  RepReliabilityFlagType,
  SessionReportCoverage
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfSessionDay, timeOnSessionDate } from "@/lib/auth/scope";
import { notificationService } from "@/lib/services/notification.service";
import { canRetryNotification, nextNotificationRetryAt } from "@/lib/services/notification-retry";
import {
  backupEscalationSms,
  lateSubmissionDeadline,
  shouldEscalateToBackup,
  shouldFlagRepReliability,
  shouldMarkNoData
} from "@/lib/services/rep-reliability";
import { ensureLectureSession } from "@/lib/services/timetable";

export async function processRepReliabilityJobs(now = new Date()) {
  const todayDow = now.getDay();
  const schedules = await prisma.classSchedule.findMany({
    where: { dayOfWeek: todayDow },
    include: {
      course: {
        include: {
          department: { include: { faculty: true } },
          repAssignments: {
            where: { isActive: true },
            include: {
              profile: { select: { id: true, isActive: true } },
              sealedIdentity: { select: { realPhone: true, realName: true } }
            }
          }
        }
      }
    },
    take: 500
  });

  let backupNotified = 0;
  let noDataMarked = 0;
  let reliabilityFlags = 0;
  const settingsByUniversity = new Map<string, Awaited<ReturnType<typeof prisma.universitySettings.findUnique>>>();

  for (const schedule of schedules) {
    const universityId = schedule.course.department.faculty.universityId;
    if (!settingsByUniversity.has(universityId)) {
      settingsByUniversity.set(universityId, await prisma.universitySettings.findUnique({ where: { universityId } }));
    }
    const settings = settingsByUniversity.get(universityId);
    const windowHours = settings?.submissionWindowHours ?? 2;
    const lateHours = settings?.lateSubmissionHours ?? 24;
    const escalateMinutes = settings?.backupEscalateMinutes ?? 30;
    const missThreshold = settings?.missedReportFlagThreshold ?? 3;
    const smsEnabled = settings?.backupNotifySmsEnabled !== false;

    const lectureDate = startOfSessionDay(now);
    const classEndAt = timeOnSessionDate(lectureDate, schedule.endTime);
    const windowClosedAt = new Date(classEndAt.getTime() + windowHours * 60 * 60 * 1000);
    const lateDeadline = lateSubmissionDeadline(windowClosedAt, lateHours);

    // Only act after class has ended
    if (now < classEndAt) continue;

    const session = await ensureLectureSession({ scheduleId: schedule.id, lectureDate });
    const reports = await prisma.lectureReport.findMany({
      where: { scheduleId: schedule.id, lectureDate, isVoided: false },
      select: { id: true }
    });
    const hasAnyReport = reports.length > 0;

    if (
      smsEnabled &&
      shouldEscalateToBackup({
        now,
        classEndAt,
        backupEscalateMinutes: escalateMinutes,
        hasAnyReport,
        alreadyNotifiedBackup: Boolean(session.backupNotifiedAt)
      })
    ) {
      const backup = schedule.course.repAssignments.find((a) => a.dutyRole === RepDutyRole.BACKUP && a.profile.isActive);
      if (backup?.sealedIdentity.realPhone) {
        const message = backupEscalationSms({
          courseCode: schedule.course.code,
          lectureDate: lectureDate.toISOString().slice(0, 10),
          endTime: schedule.endTime
        });
        const status = await notificationService.sendSms(backup.sealedIdentity.realPhone, message);
        await prisma.repNotification.create({
          data: {
            profileId: backup.profileId,
            courseId: schedule.courseId,
            sessionId: session.id,
            channel: NotificationChannel.SMS,
            kind: RepNotificationKind.BACKUP_ESCALATION,
            message,
            status,
            nextRetryAt: status === DeliveryStatus.FAILED ? nextNotificationRetryAt(1, now) : null
          }
        });
        await prisma.lectureSession.update({
          where: { id: session.id },
          data: { backupNotifiedAt: now }
        });
        backupNotified += 1;
      }
    }

    if (
      shouldMarkNoData({
        now,
        lateDeadline,
        hasAnyReport,
        alreadyMarked: session.reportCoverage === SessionReportCoverage.NO_DATA || Boolean(session.noDataMarkedAt)
      })
    ) {
      await prisma.lectureSession.update({
        where: { id: session.id },
        data: {
          reportCoverage: SessionReportCoverage.NO_DATA,
          noDataMarkedAt: now
        }
      });
      noDataMarked += 1;

      const primary = schedule.course.repAssignments.find((a) => a.dutyRole === RepDutyRole.PRIMARY && a.profile.isActive);
      if (primary) {
        const updated = await prisma.repAssignment.update({
          where: { id: primary.id },
          data: {
            missedReportCount: { increment: 1 },
            lastMissedAt: now
          }
        });
        if (shouldFlagRepReliability(updated.missedReportCount, missThreshold) && !updated.reliabilityFlaggedAt) {
          await prisma.repReliabilityFlag.create({
            data: {
              profileId: primary.profileId,
              courseId: schedule.courseId,
              type: RepReliabilityFlagType.REPEATED_MISS_REPORT,
              message: `Class rep missed ${updated.missedReportCount} reports for ${schedule.course.code}. Session marked NO_DATA (not lecture missed).`
            }
          });
          await prisma.repAssignment.update({
            where: { id: primary.id },
            data: { reliabilityFlaggedAt: now }
          });
          reliabilityFlags += 1;
        }
      }
    }
  }

  return { backupNotified, noDataMarked, reliabilityFlags };
}

export async function retryFailedRepNotifications(now = new Date()) {
  const pending = await prisma.repNotification.findMany({
    where: { status: DeliveryStatus.FAILED, nextRetryAt: { lte: now } },
    include: {
      profile: {
        include: {
          repAssignments: {
            where: { isActive: true },
            include: { sealedIdentity: true },
            take: 1
          }
        }
      }
    }
  });
  let retried = 0;
  for (const notice of pending) {
    const universityId = notice.profile.universityId;
    const settings = await prisma.universitySettings.findUnique({ where: { universityId } });
    const maxRetries = settings?.notificationMaxRetries ?? 3;
    if (!canRetryNotification(notice, maxRetries, now)) continue;
    const phone =
      notice.profile.phone ??
      notice.profile.repAssignments[0]?.sealedIdentity.realPhone ??
      null;
    if (!phone) continue;
    const status = await notificationService.sendSms(phone, notice.message);
    const attemptCount = notice.attemptCount + 1;
    await prisma.repNotification.update({
      where: { id: notice.id },
      data: {
        status,
        attemptCount,
        lastAttemptAt: now,
        nextRetryAt: status === DeliveryStatus.FAILED ? nextNotificationRetryAt(attemptCount, now) : null
      }
    });
    retried += 1;
  }
  return retried;
}
