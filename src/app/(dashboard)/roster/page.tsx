import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { rosterProposalScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RosterReviewActions } from "@/components/roster/RosterReviewActions";

export default async function RosterPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const canReview = profile.role === Role.SUPER_ADMIN || profile.role === Role.QA_OFFICER || profile.role === Role.QA_ASSISTANT;
  const proposals = await prisma.rosterProposal.findMany({
    where: rosterProposalScope(profile),
    include: { course: { select: { code: true, title: true } }, proposedBy: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  const pending = proposals.filter((proposal) => proposal.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Reporter roster"
        description="HODs propose people for a course roster. QA approves them onto SealedRepIdentity so rotation can reuse a real person instead of inventing one."
      />
      <SectionPanel title="Pending proposals" description={`${pending.length} waiting for review.`}>
        {pending.length ? (
          <div className="space-y-3">
            {pending.map((proposal) => (
              <div key={proposal.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-navy">{proposal.course.code}</p>
                  <p className="mt-1 text-sm">{proposal.realName} · {proposal.realEmail}</p>
                  <p className="mt-1 text-xs text-muted">Proposed by {proposal.proposedBy.displayName ?? proposal.proposedBy.email ?? "HOD"}</p>
                </div>
                {canReview ? <RosterReviewActions proposalId={proposal.id} /> : <StatusBadge tone="amber">Pending QA</StatusBadge>}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No pending roster proposals.</p>}
      </SectionPanel>
      <SectionPanel title="History">
        <div className="space-y-2">
          {proposals.filter((proposal) => proposal.status !== "PENDING").map((proposal) => (
            <div key={proposal.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>{proposal.course.code} · {proposal.realName}</span>
              <StatusBadge tone={proposal.status === "APPROVED" ? "green" : "red"}>{proposal.status}</StatusBadge>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
