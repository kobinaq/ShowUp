import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.lectureReport.findUnique({
    where: { id },
    include: { course: { include: { lecturer: true } }, topicsCovered: { include: { topic: true } }, teachingAids: true, flags: true, contest: true }
  });
  if (!report) notFound();
  return (
    <article className="space-y-6">
      <header className="rounded-card bg-white p-5 shadow-card">
        <p className="font-mono text-sm text-muted">{report.course.code}</p>
        <h1 className="font-display text-2xl font-bold">{report.course.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : "green"}>{report.lecturerPresent}</StatusBadge>
          {report.contest ? <StatusBadge tone="amber">{report.contest.status}</StatusBadge> : null}
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Topics">{report.topicsCovered.map((topic) => <p key={topic.id}>{topic.topic.title}</p>)}</Card>
        <Card title="Quality"><p>Interactive: {report.wasInteractive}</p><p>Aids: {report.teachingAids.map((aid) => aid.type).join(", ")}</p><p>Students: {report.studentCount ?? "-"}</p></Card>
        <Card title="Flags">{report.flags.length ? report.flags.map((flag) => <p key={flag.id}>{flag.type}: {flag.message}</p>) : "No flags"}</Card>
        <Card title="Notes">{report.additionalNotes ?? "No additional notes"}</Card>
      </section>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><h2 className="font-display text-lg font-bold">{title}</h2><div className="mt-3 space-y-2 text-sm">{children}</div></div>;
}
