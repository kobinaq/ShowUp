import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function RepHistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id } }) : null;
  const reports = profile
    ? await prisma.lectureReport.findMany({ where: { submittedById: profile.id }, include: { course: true }, orderBy: { lectureDate: "desc" } })
    : [];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">History</h1>
      {reports.map((report) => (
        <article key={report.id} className="rounded-card border bg-white p-4 shadow-card">
          <p className="font-mono text-sm text-muted">{report.course.code}</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-semibold">{report.lectureDate.toDateString()}</p>
            <StatusBadge tone={report.lecturerPresent === "ABSENT" ? "red" : "green"}>{report.lecturerPresent}</StatusBadge>
          </div>
        </article>
      ))}
    </div>
  );
}
