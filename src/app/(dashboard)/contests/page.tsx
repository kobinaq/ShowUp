import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { contestScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ContestsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { id: true, role: true, universityId: true, departmentId: true } })
    : null;
  const contests = profile
    ? await prisma.contest.findMany({ where: contestScope(profile), include: { report: { include: { course: true } }, raisedBy: true }, orderBy: { raisedAt: "desc" } })
    : [];
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
