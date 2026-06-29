import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AdminSetupPanel } from "@/components/admin/AdminSetupPanel";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, departmentId: true } })
    : null;
  const canManageStructure = profile?.role === "SUPER_ADMIN";
  const departmentFilter = canManageStructure ? {} : { id: profile?.departmentId ?? "__none__" };
  const [universities, faculties, departments, lecturers, semesters, profiles, logs] = await Promise.all([
    prisma.university.findMany(),
    prisma.faculty.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: departmentFilter, orderBy: { name: "asc" } }),
    prisma.lecturer.findMany({ where: { departmentId: canManageStructure ? undefined : profile?.departmentId ?? "__none__" }, orderBy: { lastName: "asc" } }),
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
      <AdminSetupPanel
        universities={universities.map((item) => ({ id: item.id, name: item.name }))}
        faculties={faculties.map((item) => ({ id: item.id, name: item.name }))}
        departments={departments.map((item) => ({ id: item.id, name: item.name }))}
        semesters={semesters.map((item) => ({ id: item.id, name: item.name }))}
        lecturers={lecturers.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}`, departmentId: item.departmentId }))}
        canManageStructure={canManageStructure}
      />
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
