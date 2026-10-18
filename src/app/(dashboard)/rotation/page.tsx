import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { courseScope } from "@/lib/auth/scope";
import { assignmentIsDue } from "@/lib/services/rotation.service";
import { daysOverdue, latestRotationFailure } from "@/lib/services/rotation-health";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { RetryRotationButton } from "@/components/rotation/RetryRotationButton";

export default async function RotationHealthPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const now = new Date();
  const assignments = await prisma.repAssignment.findMany({
    where: { isActive: true, course: courseScope(profile) },
    include: { course: { select: { id: true, code: true, title: true } }, profile: { select: { anonymousAlias: true } } }
  });
  const due = assignments.filter((assignment) => assignmentIsDue(assignment, now));
  const logs = due.length
    ? await prisma.rotationLog.findMany({
        where: { courseId: { in: due.map((assignment) => assignment.courseId) } },
        orderBy: { createdAt: "desc" }
      })
    : [];
  const rows = due.map((assignment) => ({
    assignment,
    days: daysOverdue(assignment, now),
    error: latestRotationFailure(logs.filter((log) => log.courseId === assignment.courseId))
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Rotation health"
        description="Courses whose reporter assignment is overdue, plus the last error if cron already tried and failed."
      />
      <SectionPanel title="Overdue rotations" description={`${rows.length} active assignments are past their rotation window.`}>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map(({ assignment, days, error }) => (
              <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-navy">{assignment.course.code}</p>
                  <p className="mt-1 text-sm text-muted">{days} day{days === 1 ? "" : "s"} overdue · {assignment.profile.anonymousAlias ?? "Reporter"}</p>
                  {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
                </div>
                <RetryRotationButton courseId={assignment.courseId} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No overdue rotations in scope.</p>}
      </SectionPanel>
    </div>
  );
}
