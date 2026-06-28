import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";

export default async function LecturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lecturer = await prisma.lecturer.findUnique({ where: { id }, include: { courses: true, flags: true, notifications: true } });
  if (!lecturer) notFound();
  const coverage = await Promise.all(lecturer.courses.map((course) => coverageService.calculate(course.id).then((summary) => [course.code, summary] as const)));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{lecturer.firstName} {lecturer.lastName}</h1>
        <p className="text-muted">{lecturer.email} - {lecturer.phone}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Courses" value={lecturer.courses.length} />
        <Metric label="Flags" value={lecturer.flags.length} />
        <Metric label="Notifications" value={lecturer.notifications.length} />
      </section>
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Coverage</h2>
        <div className="mt-4 space-y-3">
          {coverage.map(([code, item]) => <p key={code} className="font-mono">{code}: {item.coveragePercent}% {item.pacingStatus}</p>)}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}
