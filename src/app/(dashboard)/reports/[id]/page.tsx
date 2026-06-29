import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { displayText } from "@/lib/utils/displayText";
import { createClient } from "@/lib/supabase/server";

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
      contest: { include: { raisedBy: true, resolvedBy: true } }
    }
  });
  if (!report) notFound();
  return (
    <article className="space-y-6">
      <header className="rounded-card bg-white p-5 shadow-card">
        <p className="font-mono text-sm text-muted">{report.course.code}</p>
        <h1 className="font-display text-2xl font-bold">{report.course.title}</h1>
        <p className="mt-1 text-sm text-muted">{report.course.lecturer.firstName} {report.course.lecturer.lastName} - {report.lectureDate.toDateString()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.lecturerPresent}</StatusBadge>
          {report.arrivalStatus ? <StatusBadge tone={report.arrivalStatus === "LATE" ? "amber" : "green"}>{report.arrivalStatus}</StatusBadge> : null}
          {report.contest ? <StatusBadge tone="amber">{report.contest.status}</StatusBadge> : null}
        </div>
      </header>
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
          {report.flags.length ? report.flags.map((flag) => <p key={flag.id}><span className="font-semibold">{flag.type}:</span> {displayText(flag.message)}</p>) : "No flags"}
        </Card>
        <Card title="Contest">
          {report.contest ? (
            <>
              <Detail label="Status" value={report.contest.status} />
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
  return <div className="rounded-card bg-white p-5 shadow-card"><h2 className="font-display text-lg font-bold">{title}</h2><div className="mt-3 space-y-2 text-sm">{children}</div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold">{label}:</span> {value}</p>;
}
