import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { displayText } from "@/lib/utils/displayText";

export default async function FlagsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const flags = await prisma.flag.findMany({
    where: isSuperAdmin
      ? {}
      : isDepartmentScope
        ? { lecturer: { departmentId: profile?.departmentId ?? "__none__" } }
        : { lecturer: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } },
    include: { lecturer: true, report: { include: { course: true } } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h1 className="font-display text-2xl font-bold">Flags</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2">Type</th><th>Lecturer</th><th>Course</th><th>Status</th><th>Message</th></tr></thead>
          <tbody>{flags.map((flag) => (
            <tr key={flag.id} className="border-t odd:bg-slate-50/70">
              <td className="py-3 font-mono">{flag.type}</td>
              <td>{flag.lecturer.firstName} {flag.lecturer.lastName}</td>
              <td>{flag.report?.course.code ?? "-"}</td>
              <td><StatusBadge tone={flag.isResolved ? "green" : "amber"}>{flag.isResolved ? "Reviewed" : "Open"}</StatusBadge></td>
              <td>{displayText(flag.message)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
