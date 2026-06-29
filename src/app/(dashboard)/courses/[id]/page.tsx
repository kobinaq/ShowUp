import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const course = await prisma.course.findFirst({
    where: {
      id,
      ...(isSuperAdmin
        ? {}
        : isDepartmentScope
          ? { departmentId: profile?.departmentId ?? "__none__" }
          : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } })
    },
    include: {
      lecturer: true,
      schedule: true,
      outline: { include: { topics: { orderBy: { order: "asc" } } } },
      reports: { include: { course: { include: { lecturer: true } }, flags: true, contest: true }, orderBy: { lectureDate: "desc" } },
      repAssignments: { include: { profile: true } }
    }
  });
  if (!course) notFound();
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-sm text-muted">{course.code}</p>
        <h1 className="font-display text-3xl font-bold">{course.title}</h1>
        <p className="mt-1 text-muted">{course.lecturer.firstName} {course.lecturer.lastName}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Schedule">{course.schedule.map((item) => <p key={item.id}>{item.startTime}-{item.endTime} {item.venue}</p>)}</Panel>
        <Panel title="Reporter">{course.repAssignments.find((item) => item.isActive)?.profile.anonymousAlias ?? "No active reporter"}</Panel>
        <Panel title="Reports">{course.reports.length}</Panel>
      </div>
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Outline topics</h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {course.outline?.topics.map((topic) => <li key={topic.id} className="rounded-md border p-3 text-sm">Week {topic.weekNumber ?? "-"}: {topic.title}</li>)}
        </ol>
      </section>
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Reports</h2>
        <ReportTable reports={course.reports} />
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{title}</p><div className="mt-2 font-semibold">{children}</div></div>;
}
