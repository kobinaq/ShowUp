import { ContestStatus, DeliveryStatus, NotificationChannel, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isContestOverdue } from "@/lib/services/contest-sla";
import { lecturerDigestBody, shouldSendLecturerDigest } from "@/lib/services/lecturer-digest";
import { canRetryNotification, nextNotificationRetryAt } from "@/lib/services/notification-retry";
import { notificationService } from "@/lib/services/notification.service";

export async function retryFailedNotifications(now = new Date()) {
  const pending = await prisma.lecturerNotification.findMany({
    where: { status: DeliveryStatus.FAILED, nextRetryAt: { lte: now } },
    include: { lecturer: { include: { department: { include: { faculty: true } } } } }
  });
  let retried = 0;
  for (const notice of pending) {
    const settings = await prisma.universitySettings.findUnique({
      where: { universityId: notice.lecturer.department.faculty.universityId }
    });
    const maxRetries = settings?.notificationMaxRetries ?? 3;
    if (!canRetryNotification(notice, maxRetries, now)) continue;
    const status =
      notice.channel === NotificationChannel.EMAIL
        ? await notificationService.sendEmail(
            notice.lecturer.email,
            notice.subject ?? "ShowUp notice",
            `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C"><p>${notice.message}</p></div>`
          )
        : await notificationService.sendSms(notice.lecturer.phone, notice.message);
    const attemptCount = notice.attemptCount + 1;
    await prisma.lecturerNotification.update({
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

export async function sendLecturerDigests(now = new Date()) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lecturers = await prisma.lecturer.findMany({
    where: { digestEmailEnabled: true },
    include: {
      department: { include: { faculty: true } },
      notifications: { where: { sentAt: { gte: since } }, orderBy: { sentAt: "asc" } }
    }
  });
  let sent = 0;
  for (const lecturer of lecturers) {
    const settings = await prisma.universitySettings.findUnique({
      where: { universityId: lecturer.department.faculty.universityId }
    });
    if (!shouldSendLecturerDigest(settings?.lecturerDigestEnabled ?? false, lecturer.digestEmailEnabled, lecturer.notifications.length)) {
      continue;
    }
    await notificationService.sendLecturerDigest(
      lecturer.email,
      lecturer.firstName,
      lecturerDigestBody(lecturer.notifications)
    );
    sent += 1;
  }
  return sent;
}

export async function escalateOverdueContests(now = new Date()) {
  const pending = await prisma.contest.findMany({
    where: { status: ContestStatus.PENDING, escalatedAt: null },
    include: {
      report: { include: { course: { include: { department: { include: { faculty: true } } } } } }
    }
  });
  let escalated = 0;
  for (const contest of pending) {
    const universityId = contest.report.course.department.faculty.universityId;
    const settings = await prisma.universitySettings.findUnique({ where: { universityId } });
    if (
      !isContestOverdue({
        status: contest.status,
        raisedAt: contest.raisedAt,
        slaDays: settings?.contestSlaDays ?? 5,
        now
      })
    ) {
      continue;
    }
    const officers = await prisma.profile.findMany({
      where: {
        universityId,
        isActive: true,
        role: { in: [Role.QA_OFFICER, Role.QA_ASSISTANT] },
        email: { not: null }
      },
      select: { email: true }
    });
    await Promise.all(
      officers.map((officer) =>
        officer.email
          ? notificationService.sendEmail(
              officer.email,
              `Overdue contest: ${contest.report.course.code}`,
              `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C"><p>A contest for ${contest.report.course.code} has passed the review SLA.</p></div>`
            )
          : Promise.resolve()
      )
    );
    await prisma.contest.update({ where: { id: contest.id }, data: { escalatedAt: now } });
    escalated += 1;
  }
  return escalated;
}

export async function runOpsJobs(now = new Date()) {
  return {
    retries: await retryFailedNotifications(now),
    digests: await sendLecturerDigests(now),
    contests: await escalateOverdueContests(now)
  };
}
