import { randomUUID } from "crypto";
import { Role, type LatePing } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";

type PingResult = { success: true; ping: LatePing } | { success: false; error: string };

export async function isPingEligible(courseId: string, scheduleId: string, lectureDate: Date, universityId: string) {
  const [settings, schedule, existing] = await Promise.all([
    prisma.universitySettings.findUnique({ where: { universityId } }),
    prisma.classSchedule.findUnique({ where: { id: scheduleId } }),
    prisma.latePing.findFirst({ where: { courseId, scheduleId, lectureDate: dayRange(lectureDate) } })
  ]);
  if (!schedule) return { eligible: false, reason: "Schedule not found" };
  if (schedule.courseId !== courseId) return { eligible: false, reason: "Schedule does not belong to this course" };
  if (lectureDate.getDay() !== schedule.dayOfWeek) return { eligible: false, reason: "This schedule does not meet today" };
  if (existing) return { eligible: false, reason: "Ping already sent for this session" };

  const threshold = settings?.latePingThresholdMinutes ?? 30;
  const now = new Date();
  const classStart = timeOnDate(lectureDate, schedule.startTime);
  const classEnd = timeOnDate(lectureDate, schedule.endTime);
  const pingAvailableAt = new Date(classStart.getTime() + threshold * 60 * 1000);

  if (now < pingAvailableAt) {
    const minutesRemaining = Math.ceil((pingAvailableAt.getTime() - now.getTime()) / 60000);
    return { eligible: false, reason: `Ping available in ${minutesRemaining} minutes` };
  }
  if (now > classEnd) return { eligible: false, reason: "Class has already ended" };
  return { eligible: true };
}

export async function sendLatePing(courseId: string, scheduleId: string, sentById: string, lectureDate: Date, universityId: string): Promise<PingResult> {
  const eligibility = await isPingEligible(courseId, scheduleId, lectureDate, universityId);
  if (!eligibility.eligible) return { success: false, error: eligibility.reason ?? "Ping is not available" };

  const [settings, course] = await Promise.all([
    prisma.universitySettings.findUnique({ where: { universityId } }),
    prisma.course.findUnique({ where: { id: courseId }, include: { lecturer: true, schedule: true } })
  ]);
  if (!course) return { success: false, error: "Course not found" };
  const schedule = course.schedule.find((item) => item.id === scheduleId);
  if (!schedule) return { success: false, error: "Schedule not found" };

  const threshold = settings?.latePingThresholdMinutes ?? 30;
  const acknowledgeToken = randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ping = await prisma.latePing.create({
    data: {
      courseId,
      scheduleId,
      sentById,
      lectureDate: startOfDay(lectureDate),
      minutesLate: threshold,
      acknowledgeToken,
      lecturerSmsStatus: "pending",
      lecturerEmailStatus: "pending",
      qaNotified: false
    }
  });

  const lecturerName = `${course.lecturer.firstName} ${course.lecturer.lastName}`;
  const smsStatus = settings?.latePingSmsEnabled === false
    ? "skipped"
    : await notificationService.sendSms(
        course.lecturer.phone,
        `ShowUp alert: you are ${threshold} minutes late for your ${course.code} class today at ${formatClassTime(schedule.startTime)}. Venue: ${schedule.venue ?? "scheduled venue"}. Please check your email. Do not reply to this message.`
      );
  const lecturerEmailStatus = settings?.latePingEmailEnabled === false
    ? "skipped"
    : await notificationService.sendEmail(
        course.lecturer.email,
        `ShowUp late alert - ${course.code}`,
        buildPingEmailHtml({
          lecturerName,
          courseCode: course.code,
          courseTitle: course.title,
          minutesLate: threshold,
          venue: schedule.venue ?? "your scheduled venue",
          acknowledgeUrl: `${appUrl}/api/pings/${acknowledgeToken}/acknowledge`
        })
      );

  const qaOfficers = await prisma.profile.findMany({ where: { role: Role.QA_OFFICER, universityId, email: { not: null } } });
  if (settings?.qaLatePingEmailEnabled !== false) {
    await Promise.all(
      qaOfficers.map((qa) =>
        notificationService.sendEmail(
          qa.email!,
          `ShowUp late alert - ${course.code}`,
          `<p>A late alert was sent to ${lecturerName} for <strong>${course.code}</strong> at ${formatClassTime(schedule.startTime)} on ${lectureDate.toDateString()}.</p>`
        )
      )
    );
  }

  const updated = await prisma.latePing.update({
    where: { id: ping.id },
    data: {
      lecturerSmsStatus: smsStatus,
      lecturerEmailStatus,
      qaNotified: settings?.qaLatePingEmailEnabled !== false && qaOfficers.length > 0
    }
  });
  return { success: true, ping: updated };
}

export async function acknowledgePing(token: string) {
  const ping = await prisma.latePing.findUnique({
    where: { acknowledgeToken: token },
    include: { course: { include: { lecturer: true } }, schedule: true }
  });
  if (!ping) return { status: "not_found" as const };

  const classEnd = timeOnDate(ping.lectureDate, ping.schedule.endTime);
  if (new Date() > classEnd) return { status: "expired" as const };
  if (ping.acknowledgedAt) return { status: "already_acknowledged" as const };

  await prisma.latePing.update({ where: { id: ping.id }, data: { acknowledgedAt: new Date() } });
  return { status: "acknowledged" as const, lecturerName: `${ping.course.lecturer.firstName} ${ping.course.lecturer.lastName}` };
}

export async function handlePostClassPingEscalation(courseId: string, lectureDate: Date, lecturerPresent: string, reportId: string) {
  const ping = await prisma.latePing.findFirst({
    where: { courseId, lectureDate: dayRange(lectureDate), reportId: null },
    include: { course: { include: { lecturer: true } } }
  });
  if (!ping) return;

  const shouldEscalate = lecturerPresent === "ABSENT" && !ping.hodNotified;
  if (shouldEscalate) {
    const hod = await prisma.profile.findFirst({
      where: { departmentId: ping.course.departmentId, role: { in: [Role.HOD, Role.HOD_ASSISTANT] }, email: { not: null } }
    });
    if (hod?.email) {
      await notificationService.sendEmail(
        hod.email,
        `ShowUp absence after alert - ${ping.course.code}`,
        `<p>${ping.course.lecturer.firstName} ${ping.course.lecturer.lastName} was still marked absent for <strong>${ping.course.code}</strong> after a late alert had been sent.</p>`
      );
    }
  }

  await prisma.latePing.update({
    where: { id: ping.id },
    data: {
      reportId,
      hodNotified: shouldEscalate || ping.hodNotified,
      hodNotifiedAt: shouldEscalate ? new Date() : ping.hodNotifiedAt
    }
  });
}

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function timeOnDate(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function formatClassTime(time: string) {
  const [hourText, minuteText] = time.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date.toLocaleTimeString("en", { hour: "numeric", minute: Number(minuteText) ? "2-digit" : undefined, hour12: true }).toLowerCase().replace(" ", "");
}

function buildPingEmailHtml(params: { lecturerName: string; courseCode: string; courseTitle: string; minutesLate: number; venue: string; acknowledgeUrl: string }) {
  return `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C">
    <h1>ShowUp late alert</h1>
    <p>Dear ${params.lecturerName},</p>
    <p>Your class <strong>${params.courseCode} - ${params.courseTitle}</strong> started ${params.minutesLate} minutes ago and students are waiting at <strong>${params.venue}</strong>.</p>
    <p><a href="${params.acknowledgeUrl}" style="display:inline-block;background:#00C48C;color:#0D1F3C;padding:12px 18px;border-radius:8px;font-weight:700;text-decoration:none">I'm on my way</a></p>
    <p style="font-size:12px;color:#6B7280">This link expires at the end of the scheduled class time. Do not reply to this automated message.</p>
  </div>`;
}
