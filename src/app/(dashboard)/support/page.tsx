import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { SupportButton } from "@/components/support/SupportButton";
import { SupportTicketList, type SupportTicketListItem } from "@/components/support/SupportTicketList";

export default async function SupportPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { id: true, role: true, universityId: true } })
    : null;
  const role = profile?.role ?? Role.HOD;
  const canManage = role === Role.IT || role === Role.SUPER_ADMIN;
  const where = role === Role.SUPER_ADMIN
    ? {}
    : role === Role.IT
      ? { universityId: profile?.universityId ?? "__none__" }
      : { requesterId: profile?.id ?? "__none__" };
  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      requester: { select: { displayName: true, email: true, role: true } },
      assignedTo: { select: { displayName: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const payload: SupportTicketListItem[] = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    emailStatus: ticket.emailStatus,
    smsStatus: ticket.smsStatus,
    createdAt: ticket.createdAt.toISOString(),
    requester: ticket.requester,
    assignedTo: ticket.assignedTo
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={canManage ? "IT Support Queue" : "IT Support"}
        eyebrow="Support"
        description={canManage ? "Review and resolve support requests from users in your university." : "Track requests you have sent to your university IT team."}
        actions={<SupportButton compact />}
      />
      <SectionPanel title={canManage ? "Ticket queue" : "My IT requests"} description={`${tickets.length} support request${tickets.length === 1 ? "" : "s"} in this view.`}>
        <SupportTicketList tickets={payload} canManage={canManage} />
      </SectionPanel>
    </div>
  );
}
