import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { displayText } from "@/lib/utils/displayText";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const report = await prisma.lectureReport.findFirst({
    where: {
      id,
      ...(isSuperAdmin
        ? {}
        : isDepartmentScope
          ? { course: { departmentId: profile?.departmentId ?? "__none__" } }
          : { course: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } })
    },
    include: {
      course: { include: { lecturer: true, schedule: true } },
      schedule: true,
      submittedBy: true,
      topicsCovered: { include: { topic: true } },
      teachingAids: true,
      flags: true,
      latePing: true,
      contest: { include: { raisedBy: true, resolvedBy: true } }
    }
  });
  if (!report) notFound();
  return (
    <article className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: report.course.code }]}
        eyebrow={report.lectureDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        title={`${report.course.code} · ${report.course.title}`}
        description={`${report.course.lecturer.firstName} ${report.course.lecturer.lastName} · ${report.schedule.startTime}-${report.schedule.endTime}`}
      />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.lecturerPresent}</StatusBadge>
          {report.arrivalStatus ? <StatusBadge tone={report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.arrivalStatus}</StatusBadge> : null}
          {report.contest ? <StatusBadge tone="amber">{report.contest.status}</StatusBadge> : null}
        </div>
      </section>
      {report.latePing ? (
        <section className={`rounded-card border p-5 shadow-card ${report.latePing.acknowledgedAt ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <h2 className="font-display text-lg font-bold">Late alert sent</h2>
          <p className="mt-2 text-sm text-slate-700">Class rep sent a late alert at {report.latePing.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({report.latePing.minutesLate} minutes after class start).</p>
          <p className="mt-1 text-sm text-slate-700">Lecturer response: {report.latePing.acknowledgedAt ? <span className="font-semibold text-green-700">Acknowledged at {report.latePing.acknowledgedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> : <span className="font-semibold text-amber-700">No response</span>}</p>
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Session">
          <Detail label="Lecture date" value={report.lectureDate.toDateString()} />
          <Detail label="Scheduled time" value={`${report.schedule.startTime}-${report.schedule.endTime}`} />
          <Detail label="Venue" value={report.schedule.venue ?? "-"} />
          <Detail label="Submitted at" value={report.submittedAt.toLocaleString()} />
          <Detail label="Submission window closed" value={report.windowClosedAt.toLocaleString()} />
        </Card>
        <Card title="Presence and timing">
          <Detail label="Lecturer presence" value={report.lecturerPresent} />
          <Detail label="Arrival status" value={report.arrivalStatus ?? "-"} />
          <Detail label="Late minutes" value={report.lateMinutes?.toString() ?? "0"} />
          <Detail label="Early dismissal" value={report.earlyDismissal ? "Yes" : "No"} />
          <Detail label="Dismissed early minutes" value={report.dismissedEarlyMinutes?.toString() ?? "0"} />
          <Detail label="Substitute note" value={report.substituteNote ?? "-"} />
        </Card>
        <Card title="Topics">
          {report.topicsCovered.length ? report.topicsCovered.map((topic) => <p key={topic.id}>{topic.topic.title}</p>) : <p>No topics selected.</p>}
          <Detail label="Previous topics revisited" value={report.previousTopicsRevisited ? "Yes" : "No"} />
        </Card>
        <Card title="Teaching quality">
          <Detail label="Interactivity" value={report.wasInteractive} />
          <Detail label="Teaching aids" value={report.teachingAids.length ? report.teachingAids.map((aid) => aid.type).join(", ") : "None"} />
          <Detail label="Student count" value={report.studentCount?.toString() ?? "-"} />
        </Card>
        <Card title="Flags">
          {report.flags.length ? report.flags.map((flag) => <p key={flag.id}><span className="font-semibold">{displayText(flag.type)}:</span> {displayText(flag.message)}</p>) : "No flags"}
        </Card>
        <Card title="Contest">
          {report.contest ? (
            <>
              <Detail label="Status" value={displayText(report.contest.status)} />
              <Detail label="Reason" value={displayText(report.contest.reason)} />
              <Detail label="Raised by" value={report.contest.raisedBy.displayName ?? report.contest.raisedBy.email ?? "-"} />
              <Detail label="Raised at" value={report.contest.raisedAt.toLocaleString()} />
              <Detail label="Resolution note" value={displayText(report.contest.resolutionNote) || "-"} />
            </>
          ) : "No contest raised"}
        </Card>
        <Card title="Notes">{displayText(report.additionalNotes) || "No additional notes"}</Card>
      </section>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <SectionPanel title={title}><div className="space-y-2 text-sm">{children}</div></SectionPanel>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold">{label}:</span> {displayText(value)}</p>;
}
