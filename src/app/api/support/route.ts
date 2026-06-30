import { Role, SupportPriority, SupportTicketCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { notificationService } from "@/lib/services/notification.service";

const createTicketSchema = z.object({
  subject: z.string().min(4).max(140),
  message: z.string().min(10).max(1200),
  category: z.nativeEnum(SupportTicketCategory),
  priority: z.nativeEnum(SupportPriority).default(SupportPriority.NORMAL)
});

export const GET = withAuth(async (_request, { profile }) => {
  const where = profile.role === Role.SUPER_ADMIN
    ? {}
    : profile.role === Role.IT
      ? { universityId: profile.universityId }
      : { requesterId: profile.id };
  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      requester: { select: { displayName: true, email: true, role: true } },
      assignedTo: { select: { displayName: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return json({ data: tickets });
});

export const POST = withAuth(async (request, { profile }) => {
  const parsed = createTicketSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid support request", parsed.error.flatten());

  const ticket = await prisma.supportTicket.create({
    data: {
      ...parsed.data,
      universityId: profile.universityId,
      requesterId: profile.id
    },
    include: { requester: { select: { displayName: true, email: true, role: true } } }
  });

  const statuses = await notifyUniversityIt(profile.universityId, ticket.id, parsed.data.subject, parsed.data.message);
  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { emailStatus: statuses.emailStatus, smsStatus: statuses.smsStatus },
    include: { requester: { select: { displayName: true, email: true, role: true } } }
  });
  await prisma.activityLog.create({
    data: {
      universityId: profile.universityId,
      actorId: profile.id,
      action: "SUPPORT_TICKET_CREATED",
      metadata: { ticketId: ticket.id, category: parsed.data.category, priority: parsed.data.priority }
    }
  });
  return json({ data: updated }, { status: 201 });
});

async function notifyUniversityIt(universityId: string, ticketId: string, subject: string, message: string) {
  const itUsers = await prisma.profile.findMany({
    where: { universityId, role: Role.IT, isActive: true },
    select: { email: true, phone: true, displayName: true }
  });
  const emailResults: string[] = [];
  const smsResults: string[] = [];
  for (const user of itUsers) {
    if (user.email) {
      emailResults.push(await notificationService.sendEmail(
        user.email,
        `ShowUp IT support: ${subject}`,
        `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C"><h1>ShowUp IT support</h1><p>${message}</p><p>Ticket ID: ${ticketId}</p></div>`
      ));
    }
    if (user.phone) {
      smsResults.push(await notificationService.sendSms(user.phone, `ShowUp IT support: ${subject}. Ticket ${ticketId}. Do not reply.`));
    }
  }
  return {
    emailStatus: summarizeStatus(emailResults),
    smsStatus: summarizeStatus(smsResults)
  };
}

function summarizeStatus(statuses: string[]) {
  if (!statuses.length) return "skipped";
  if (statuses.some((status) => status === "sent")) return "sent";
  if (statuses.some((status) => status === "failed")) return "failed";
  return "skipped";
}
