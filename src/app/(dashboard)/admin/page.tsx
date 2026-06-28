import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [universities, semesters, profiles, logs] = await Promise.all([
    prisma.university.findMany(),
    prisma.semester.findMany({ orderBy: { startDate: "desc" } }),
    prisma.profile.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Admin</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Universities" value={universities.length} />
        <Metric label="Semesters" value={semesters.length} />
        <Metric label="Users" value={profiles.length} />
      </section>
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Activity log</h2>
        <div className="mt-4 space-y-3 text-sm">
          {logs.map((log) => <p key={log.id}><span className="font-mono">{log.action}</span> - {log.createdAt.toLocaleString()}</p>)}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}
