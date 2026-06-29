import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AdminSetupPanel } from "@/components/admin/AdminSetupPanel";
import { displayText } from "@/lib/utils/displayText";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: {
          role: true,
          universityId: true,
          departmentId: true,
          university: { select: { name: true } },
          department: { select: { name: true } }
        }
      })
    : null;

  const role = profile?.role ?? Role.HOD;
  const isSuperAdmin = role === Role.SUPER_ADMIN;
  const isDepartmentRole = role === Role.HOD || role === Role.HOD_ASSISTANT;
  const universityId = profile?.universityId ?? "__none__";
  const departmentId = profile?.departmentId ?? "__none__";
  const scopeLabel = isSuperAdmin
    ? "all universities"
    : isDepartmentRole
      ? `${profile?.department?.name ?? "your department"} at ${profile?.university?.name ?? "your university"}`
      : profile?.university?.name ?? "your university";

  const departmentWhere = isSuperAdmin
    ? {}
    : isDepartmentRole
      ? { id: departmentId }
      : { faculty: { universityId } };
  const lecturerWhere = isSuperAdmin
    ? {}
    : isDepartmentRole
      ? { departmentId }
      : { department: { faculty: { universityId } } };
  const semesterWhere = isSuperAdmin ? {} : { universityId };
  const facultyWhere = isSuperAdmin ? {} : { universityId };
  const profileWhere = isSuperAdmin ? {} : { universityId };
  const logWhere = isSuperAdmin ? {} : { universityId };

  const [universities, faculties, departments, lecturers, semesters, profiles, logs] = await Promise.all([
    prisma.university.findMany({ where: isSuperAdmin ? {} : { id: universityId }, orderBy: { name: "asc" } }),
    prisma.faculty.findMany({ where: facultyWhere, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: departmentWhere, orderBy: { name: "asc" } }),
    prisma.lecturer.findMany({ where: lecturerWhere, orderBy: { lastName: "asc" } }),
    prisma.semester.findMany({ where: semesterWhere, orderBy: { startDate: "desc" } }),
    prisma.profile.findMany({ where: profileWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.activityLog.findMany({ where: logWhere, orderBy: { createdAt: "desc" }, take: 20 })
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{adminLabel(role)}</p>
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted">Managing {scopeLabel}.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {isSuperAdmin ? <Metric label="Universities" value={universities.length} /> : <Metric label={isDepartmentRole ? "Department" : "University"} value={1} />}
        <Metric label="Semesters" value={semesters.length} />
        <Metric label="Users" value={profiles.length} />
      </section>
      <AdminSetupPanel
        role={role}
        scopeLabel={scopeLabel}
        universities={universities.map((item) => ({ id: item.id, name: item.name }))}
        faculties={faculties.map((item) => ({ id: item.id, name: item.name }))}
        departments={departments.map((item) => ({ id: item.id, name: item.name }))}
        semesters={semesters.map((item) => ({ id: item.id, name: item.name }))}
        lecturers={lecturers.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}`, departmentId: item.departmentId }))}
      />
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Activity log</h2>
        <div className="mt-4 space-y-3 text-sm">
          {logs.length ? logs.map((log) => <p key={log.id}><span className="font-medium">{displayText(log.action)}</span> - {log.createdAt.toLocaleString()}</p>) : <p className="text-muted">No activity yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}

function adminLabel(role: Role) {
  if (role === Role.SUPER_ADMIN) return "Platform administration";
  if (role === Role.VC) return "University leadership";
  if (role === Role.QA_OFFICER) return "Quality assurance administration";
  return "Department administration";
}
