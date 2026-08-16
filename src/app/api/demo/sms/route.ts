import { randomUUID } from "crypto";
import { NotificationChannel } from "@prisma/client";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { DEMO_COOKIE, parseDemoSession } from "@/lib/auth/demo";
import { badRequest, json } from "@/lib/middleware/withAuth";
import { notificationService } from "@/lib/services/notification.service";
import { prisma } from "@/lib/prisma";
import { startOfSessionDay } from "@/lib/utils/sessionTime";

const schema = z.object({
  phone: z.string().min(8).max(20).optional(),
  kind: z.enum(["test", "late_ping", "absence"]).default("test")
});

export async function POST(request: NextRequest) {
  const session = await parseDemoSession(request.cookies.get(DEMO_COOKIE)?.value);
  if (!session) return json({ error: "Start a live demo session first" }, { status: 401 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid SMS demo request", body.error.flatten());

  const phone = (body.data.phone ?? session.phone)?.trim();
  if (!phone) return badRequest("Provide a phone number to receive the SMS (include country code, e.g. +233...)");

  if (!process.env.ARKESEL_API_KEY || !process.env.ARKESEL_SENDER_ID) {
    return json({ error: "SMS provider is not configured (ARKESEL_API_KEY / ARKESEL_SENDER_ID)" }, { status: 503 });
  }

  if (body.data.kind === "test") {
    const status = await notificationService.sendSms(
      phone,
      "ShowUp live demo: SMS notifications are working. This is a test from the ShowUp pitch demo."
    );
    return json({ ok: status === "sent", status, kind: "test", phone });
  }

  const course = await prisma.course.findFirst({
    where: { id: { startsWith: "atu_course_" } },
    include: { lecturer: true, schedule: true, department: true },
    orderBy: { code: "asc" }
  });
  if (!course || !course.schedule[0]) {
    return json({ error: "Demo course data missing. Run prisma db seed first." }, { status: 404 });
  }

  const schedule = course.schedule[0];
  const lecturerName = `${course.lecturer.firstName} ${course.lecturer.lastName}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (body.data.kind === "absence") {
    const message = `ShowUp alert: ${lecturerName} was reported absent for ${course.code} (${course.title}) today. QA has been notified.`;
    const status = await notificationService.sendSms(phone, message);
    await prisma.lecturerNotification.create({
      data: {
        lecturerId: course.lecturerId,
        channel: NotificationChannel.SMS,
        message: `[DEMO → ${phone}] ${message}`,
        status
      }
    });
    return json({
      ok: status === "sent",
      status,
      kind: "absence",
      phone,
      course: { code: course.code, title: course.title, lecturer: lecturerName }
    });
  }

  return sendPitchLatePingAnytime({ course, schedule, lecturerName, phone, appUrl });
}

async function sendPitchLatePingAnytime(input: {
  course: { id: string; code: string; title: string; lecturerId: string };
  schedule: { id: string; startTime: string; venue: string | null };
  lecturerName: string;
  phone: string;
  appUrl: string;
}) {
  const qa = await prisma.profile.findFirst({
    where: { id: "atu_profile_qa", isActive: true },
    select: { id: true }
  });
  if (!qa) return json({ error: "Demo QA profile missing. Run prisma db seed first." }, { status: 404 });

  const acknowledgeToken = randomUUID();
  const threshold = 30;
  const ping = await prisma.latePing.create({
    data: {
      courseId: input.course.id,
      scheduleId: input.schedule.id,
      sentById: qa.id,
      lectureDate: startOfSessionDay(new Date()),
      minutesLate: threshold,
      acknowledgeToken,
      lecturerSmsStatus: "pending",
      lecturerEmailStatus: "skipped",
      qaNotified: false
    }
  });

  const smsMessage = `ShowUp alert: you are ${threshold} minutes late for your ${input.course.code} class today at ${input.schedule.startTime}. Venue: ${input.schedule.venue ?? "scheduled venue"}. Acknowledge: ${input.appUrl}/api/pings/${acknowledgeToken}/acknowledge`;
  const smsStatus = await notificationService.sendSms(input.phone, smsMessage);

  const updated = await prisma.latePing.update({
    where: { id: ping.id },
    data: { lecturerSmsStatus: smsStatus, lecturerEmailStatus: "skipped", qaNotified: false }
  });

  return json({
    ok: smsStatus === "sent",
    status: smsStatus,
    kind: "late_ping",
    phone: input.phone,
    acknowledgeUrl: `${input.appUrl}/api/pings/${acknowledgeToken}/acknowledge`,
    pingId: updated.id,
    course: { code: input.course.code, title: input.course.title, lecturer: input.lecturerName, venue: input.schedule.venue }
  });
}

