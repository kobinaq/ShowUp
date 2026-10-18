import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildQualityAttendanceRow, type QualityAttendanceRow } from "@/lib/services/insights.service";
import { reportsCsv, scorecardPdf } from "@/lib/services/export.service";
import { notificationService } from "@/lib/services/notification.service";

export function monthRange(reference = new Date()) {
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
  const label = start.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
}

export async function buildMonthlyQualityRows(input: {
  universityId: string;
  facultyId?: string | null;
  departmentId?: string | null;
  start: Date;
  end: Date;
}): Promise<QualityAttendanceRow[]> {
  const departments = await prisma.department.findMany({
    where: {
      faculty: { universityId: input.universityId },
      ...(input.facultyId ? { facultyId: input.facultyId } : {}),
      ...(input.departmentId ? { id: input.departmentId } : {})
    },
    include: { faculty: { select: { id: true, name: true } } },
    orderBy: { name: "asc" }
  });

  const rows: QualityAttendanceRow[] = [];
  for (const dept of departments) {
    const reports = await prisma.lectureReport.findMany({
      where: {
        isVoided: false,
        lectureDate: { gte: input.start, lt: input.end },
        course: { departmentId: dept.id }
      },
      select: {
        lecturerPresent: true,
        arrivalStatus: true,
        studentCount: true,
        course: { select: { classSize: true } },
        lectureSession: { select: { attributedToFacilities: true } }
      }
    });
    const openFlags = await prisma.flag.count({
      where: {
        isResolved: false,
        lecturer: { departmentId: dept.id },
        createdAt: { gte: input.start, lt: input.end }
      }
    });
    const absences = reports.filter((r) => r.lecturerPresent === "ABSENT").length;
    const late = reports.filter((r) => r.arrivalStatus === "LATE" && !r.lectureSession?.attributedToFacilities).length;
    const rated = reports.filter((r) => r.studentCount != null && r.course.classSize);
    const studentPresentEquivalent = rated.reduce((sum, r) => {
      const size = r.course.classSize ?? 0;
      if (!size || r.studentCount == null) return sum;
      return sum + Math.min(100, Math.round((r.studentCount / size) * 100));
    }, 0);

    rows.push(
      buildQualityAttendanceRow({
        scopeId: dept.id,
        scopeName: `${dept.faculty.name} / ${dept.name}`,
        scopeType: "DEPARTMENT",
        reportCount: reports.length,
        absences,
        late,
        openFlags,
        studentRatedSessions: rated.length * 100,
        studentPresentEquivalent
      })
    );
  }
  return rows;
}

export function monthlyReportCsv(rows: QualityAttendanceRow[], periodLabel: string) {
  return reportsCsv(
    rows.map((row) => ({
      period: periodLabel,
      scope: row.scopeName,
      reports: row.reportCount,
      absenceRatePct: row.absenceRate,
      latenessRatePct: row.latenessRate,
      studentAttendanceRatePct: row.studentAttendanceRate,
      openFlags: row.openFlags,
      takeaway: row.takeaway
    }))
  );
}

/** Excel-friendly SpreadsheetML (opens in Excel without a new dependency). */
export function monthlyReportExcelXml(rows: QualityAttendanceRow[], periodLabel: string) {
  const header = ["Period", "Scope", "Reports", "Absence %", "Lateness %", "Student attendance %", "Open flags", "Takeaway"];
  const body = rows
    .map(
      (row) =>
        `<Row>${[
          periodLabel,
          row.scopeName,
          row.reportCount,
          row.absenceRate,
          row.latenessRate,
          row.studentAttendanceRate ?? "",
          row.openFlags,
          row.takeaway
        ]
          .map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escapeXml(String(cell))}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Monthly"><Table>
  <Row>${header.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>
  ${body}
 </Table></Worksheet>
</Workbook>`;
}

export function monthlyReportPdf(rows: QualityAttendanceRow[], periodLabel: string, scopeLabel: string) {
  const lines: Array<[string, string | number]> = [
    ["Period", periodLabel],
    ["Scope", scopeLabel],
    ["Departments", rows.length],
    ...rows.flatMap((row): Array<[string, string | number]> => [
      [row.scopeName, row.takeaway],
      [`${row.scopeName} absence %`, row.absenceRate],
      [`${row.scopeName} lateness %`, row.latenessRate]
    ])
  ];
  return scorecardPdf(`Meridiqa monthly quality report — ${periodLabel}`, lines);
}

export async function resolveReportRecipients(universityId: string, roles: string[], extraEmails: string[]) {
  const roleEnums = roles.filter((role): role is Role => Object.values(Role).includes(role as Role));
  const profiles = roleEnums.length
    ? await prisma.profile.findMany({
        where: {
          universityId,
          isActive: true,
          role: { in: roleEnums },
          email: { not: null }
        },
        select: { email: true, role: true, displayName: true }
      })
    : [];
  const emails = Array.from(
    new Set([...profiles.map((p) => p.email!).filter(Boolean), ...extraEmails.filter(Boolean)])
  );
  return emails;
}

export async function sendMonthlyReportEmail(input: {
  to: string;
  periodLabel: string;
  scopeLabel: string;
  csv: string;
}) {
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C">
    <p>Meridiqa monthly quality + attendance summary for <strong>${escapeXml(input.scopeLabel)}</strong> (${escapeXml(input.periodLabel)}).</p>
    <p>CSV report is attached as plain text below for demo-safe delivery.</p>
    <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px;font-size:12px">${escapeXml(input.csv.slice(0, 8000))}</pre>
  </div>`;
  return notificationService.sendEmail(input.to, `Meridiqa monthly report — ${input.periodLabel}`, html);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
