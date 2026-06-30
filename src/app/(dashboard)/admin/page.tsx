import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AdminSetupPanel } from "@/components/admin/AdminSetupPanel";
import { displayText } from "@/lib/utils/displayText";
import { SectionPanel } from "@/components/shared/Panels";
import { SupportTicketList, type SupportTicketListItem } from "@/components/support/SupportTicketList";
import { UserLifecyclePanel, type UserLifecycleItem } from "@/components/admin/UserLifecyclePanel";

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
  const isIt = role === Role.IT;
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

  const [universities, faculties, departments, lecturers, semesters, profiles, logs, courses, tickets] = await Promise.all([
    prisma.university.findMany({ where: isSuperAdmin ? {} : { id: universityId }, orderBy: { name: "asc" } }),
    prisma.faculty.findMany({ where: facultyWhere, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: departmentWhere, orderBy: { name: "asc" } }),
    prisma.lecturer.findMany({ where: lecturerWhere, orderBy: { lastName: "asc" } }),
    prisma.semester.findMany({ where: semesterWhere, orderBy: { startDate: "desc" } }),
    prisma.profile.findMany({ where: profileWhere, orderBy: { createdAt: "desc" } }),
    prisma.activityLog.findMany({ where: logWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.course.findMany({
      where: isSuperAdmin ? {} : { department: { faculty: { universityId } } },
      include: { schedule: true, outline: true, repAssignments: { where: { isActive: true } } }
    }),
    prisma.supportTicket.findMany({
      where: isSuperAdmin ? {} : { universityId },
      include: {
        requester: { select: { displayName: true, email: true, role: true } },
        assignedTo: { select: { displayName: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);
  const completeness = [
    { label: "Active semester", value: semesters.some((semester) => semester.isActive) ? 0 : 1 },
    { label: "Courses without class size", value: courses.filter((course) => !course.classSize).length },
    { label: "Courses without schedule", value: courses.filter((course) => course.schedule.length === 0).length },
    { label: "Courses without outline", value: courses.filter((course) => !course.outline).length },
    { label: "Departments without HOD", value: departments.filter((department) => !profiles.some((item) => item.role === Role.HOD && item.departmentId === department.id)).length },
    { label: "Courses without active reporter", value: courses.filter((course) => course.repAssignments.length === 0).length }
  ];
  const ticketPayload: SupportTicketListItem[] = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    emailStatus: ticket.emailStatus,
    smsStatus: ticket.smsStatus,
    createdAt: ticket.createdAt.toISOString(),
    requester: ticket.requester,
    assignedTo: ticket.assignedTo
  }));
  const userPayload: UserLifecycleItem[] = profiles.map((item) => ({
    id: item.id,
    displayName: item.displayName,
    email: item.email,
    role: item.role,
    isActive: item.isActive
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-muted">{adminLabel(role)}</p>
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
      {isIt ? (
        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionPanel title="Setup completeness" description="Items IT should complete before QA workflows begin.">
            <div className="grid gap-3">
              {completeness.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="font-semibold text-navy">{item.label}</span>
                  <span className={`font-mono font-bold ${item.value ? "text-amber-700" : "text-emerald-700"}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </SectionPanel>
          <SectionPanel title="Recent IT requests" description="Latest support tickets for this university.">
            <SupportTicketList tickets={ticketPayload} canManage />
          </SectionPanel>
          <SectionPanel title="User lifecycle" description="Activate or deactivate university accounts." className="xl:col-span-2">
            <UserLifecyclePanel users={userPayload} />
          </SectionPanel>
        </section>
      ) : null}
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
  if (role === Role.QA_ASSISTANT) return "Quality assurance assistant";
  if (role === Role.IT) return "IT administration";
  return "Department administration";
}
