import { prisma } from "@/lib/prisma";
import { FacultyAttendanceChart } from "@/components/charts/FacultyAttendanceChart";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: { role: true, departmentId: true }
      })
    : null;
  const isDepartmentScope = profile?.role === "HOD" || profile?.role === "HOD_ASSISTANT";
  const departmentWhere = isDepartmentScope ? { id: profile.departmentId ?? "__none__" } : {};
  const faculties = await prisma.faculty.findMany({
    include: {
      departments: {
        where: departmentWhere,
        include: { courses: { include: { reports: true, lecturer: true } } }
      }
    }
  });
  const visibleFaculties = faculties.filter((faculty) => faculty.departments.length > 0);
  const chart = isDepartmentScope
    ? visibleFaculties
        .flatMap((faculty) => faculty.departments)
        .flatMap((department) => department.courses)
        .reduce<Array<{ name: string; attendance: number; reports: number; present: number }>>((items, course) => {
          const name = `${course.lecturer.firstName} ${course.lecturer.lastName}`;
          const existing = items.find((item) => item.name === name);
          const present = course.reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
          if (existing) {
            existing.reports += course.reports.length;
            existing.present += present;
            existing.attendance = existing.reports ? Math.round((existing.present / existing.reports) * 100) : 0;
            return items;
          }
          return [
            ...items,
            {
              name,
              reports: course.reports.length,
              present,
              attendance: course.reports.length ? Math.round((present / course.reports.length) * 100) : 0
            }
          ];
        }, [])
    : faculties
        .map((faculty) => {
          const reports = faculty.departments.flatMap((department) => department.courses.flatMap((course) => course.reports));
          const present = reports.filter((report) => report.lecturerPresent !== "ABSENT").length;
          return { name: faculty.name, attendance: reports.length ? Math.round((present / reports.length) * 100) : 0 };
        });
  const courseScope = isDepartmentScope ? { course: { departmentId: profile?.departmentId ?? "__none__" } } : {};
  const lecturerScope = isDepartmentScope ? { lecturer: { departmentId: profile?.departmentId ?? "__none__" } } : {};
  const totalReports = await prisma.lectureReport.count({ where: courseScope });
  const totalFlags = await prisma.flag.count({ where: lecturerScope });
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Reports" value={totalReports} />
        <Metric label="Flags" value={totalFlags} />
        <Metric label={isDepartmentScope ? "Departments" : "Faculties"} value={isDepartmentScope ? visibleFaculties.flatMap((faculty) => faculty.departments).length : visibleFaculties.length} />
      </section>
      <section className="h-80 rounded-card bg-white p-5 shadow-card">
        <h1 className="font-display text-xl font-bold">{isDepartmentScope ? "Department lecturer attendance" : "Faculty attendance"}</h1>
        <FacultyAttendanceChart data={chart} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-card bg-white p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-2 font-mono text-3xl font-bold">{value}</p></div>;
}
