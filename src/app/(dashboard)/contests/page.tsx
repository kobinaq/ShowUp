import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function ContestsPage() {
  const contests = await prisma.contest.findMany({ include: { report: { include: { course: true } }, raisedBy: true }, orderBy: { raisedAt: "desc" } });
  return (
    <section className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Contests</h1>
      {contests.map((contest) => (
        <article key={contest.id} className="rounded-card bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm">{contest.report.course.code}</p>
              <h2 className="font-display text-xl font-bold">{contest.reason}</h2>
            </div>
            <StatusBadge tone={contest.status === "PENDING" ? "amber" : "green"}>{contest.status}</StatusBadge>
          </div>
          {contest.resolutionNote ? <p className="mt-3 text-sm text-muted">{contest.resolutionNote}</p> : null}
        </article>
      ))}
    </section>
  );
}
