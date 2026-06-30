import { Role, SupportPriority, SupportTicketStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

const updateTicketSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus).optional(),
  priority: z.nativeEnum(SupportPriority).optional(),
  assignedToId: z.string().nullable().optional(),
  resolutionNote: z.string().max(1000).nullable().optional()
});

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  if (profile.role !== Role.IT && profile.role !== Role.SUPER_ADMIN) return forbidden("Only IT can update support tickets.");
  const { id } = await params;
  const parsed = updateTicketSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid support update", parsed.error.flatten());
  const existing = await prisma.supportTicket.findFirst({
    where: profile.role === Role.SUPER_ADMIN ? { id } : { id, universityId: profile.universityId },
    select: { id: true, universityId: true }
  });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  if (parsed.data.assignedToId) {
    const assignee = await prisma.profile.findFirst({
      where: { id: parsed.data.assignedToId, universityId: existing.universityId, role: Role.IT, isActive: true },
      select: { id: true }
    });
    if (!assignee) return badRequest("Assignee must be an active IT user in this university.");
  }
  const resolvedAt = parsed.data.status === SupportTicketStatus.RESOLVED || parsed.data.status === SupportTicketStatus.CLOSED ? new Date() : undefined;
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { ...parsed.data, resolvedAt },
    include: {
      requester: { select: { displayName: true, email: true, role: true } },
      assignedTo: { select: { displayName: true, email: true } }
    }
  });
  await prisma.activityLog.create({
    data: {
      universityId: existing.universityId,
      actorId: profile.id,
      action: "SUPPORT_TICKET_UPDATED",
      metadata: { ticketId: id, status: parsed.data.status, priority: parsed.data.priority }
    }
  });
  return json({ data: ticket });
}, [Role.SUPER_ADMIN, Role.IT]);
