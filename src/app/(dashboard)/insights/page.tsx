import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { EmptyState } from "@/components/shared/EmptyState";
import { monthRange, buildMonthlyQualityRows } from "@/lib/services/monthly-report.service";
import { DEMO_ASK_QUESTIONS } from "@/lib/services/insights.service";
import { MonthlyExportButtons } from "@/components/insights/MonthlyExportButtons";

export default async function InsightsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");

  const { start, end, label } = monthRange();
  const isHod = profile.role === "HOD" || profile.role === "HOD_ASSISTANT";
  const rows = await buildMonthlyQualityRows({
    universityId: profile.universityId,
    departmentId: isHod ? profile.departmentId : null,
    start,
    end
  });
  const exportFacultyId = undefined;
  const exportDepartmentId = isHod ? profile.departmentId ?? undefined : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Attendance × lecture quality"
        description={`Combined view for ${label}: low student attendance vs late/missed lectures by department.`}
        actions={<MonthlyExportButtons facultyId={exportFacultyId} departmentId={exportDepartmentId} />}
      />

      <SectionPanel title="Department scorecard" description="Absence and lateness from class-rep reports; student rate uses reported headcount vs class size.">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Reports</th>
                  <th className="px-2 py-2">Absence %</th>
                  <th className="px-2 py-2">Lateness %</th>
                  <th className="px-2 py-2">Student att. %</th>
                  <th className="px-2 py-2">Flags</th>
                  <th className="px-2 py-2">Takeaway</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.scopeId} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-3 font-semibold text-navy">{row.scopeName}</td>
                    <td className="px-2 py-3">{row.reportCount}</td>
                    <td className="px-2 py-3">{row.absenceRate}%</td>
                    <td className="px-2 py-3">{row.latenessRate}%</td>
                    <td className="px-2 py-3">{row.studentAttendanceRate == null ? "—" : `${row.studentAttendanceRate}%`}</td>
                    <td className="px-2 py-3">{row.openFlags}</td>
                    <td className="px-2 py-3 text-xs text-muted">{row.takeaway}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No department data for last month." description="Seed or submit reports to populate the combined scorecard." />
        )}
      </SectionPanel>

      <SectionPanel title="Ask Meridiqa — demo questions" description="These prompts answer well on the ATU seed data.">
        <ul className="grid gap-2 md:grid-cols-2">
          {DEMO_ASK_QUESTIONS.map((question) => (
            <li key={question} className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-navy">
              {question}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Open the floating Meridiqa AI panel to ask live.{" "}
          <Link href="/analytics" className="font-semibold text-navy underline">
            Charts with takeaways
          </Link>{" "}
          live on Analytics.
        </p>
      </SectionPanel>
    </div>
  );
}
