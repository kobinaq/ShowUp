import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coverageService } from "@/lib/services/coverage.service";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";

export default async function LecturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const lecturer = await prisma.lecturer.findFirst({
    where: {
      id,
      ...(isSuperAdmin
        ? {}
        : isDepartmentScope
          ? { departmentId: profile?.departmentId ?? "__none__" }
          : { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } })
    },
    include: {
      courses: {
        include: {
          reports: { include: { course: { include: { lecturer: true } }, flags: true, contest: true }, orderBy: { lectureDate: "desc" } }
        }
      },
      flags: true,
      notifications: true
    }
  });
  if (!lecturer) notFound();
  const coverage = await Promise.all(lecturer.courses.map((course) => coverageService.calculate(course.id).then((summary) => [course.code, summary] as const)));
  const reports = lecturer.courses.flatMap((course) => course.reports).sort((first, second) => second.lectureDate.getTime() - first.lectureDate.getTime());
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
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Reports</h2>
        <ReportTable reports={reports} showCourseTitle />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}
