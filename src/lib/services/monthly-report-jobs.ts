import { ReportExportFormat, ReportScopeType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildMonthlyQualityRows,
  monthRange,
  monthlyReportCsv,
  resolveReportRecipients,
  sendMonthlyReportEmail
} from "@/lib/services/monthly-report.service";

export async function runDueMonthlyReports(now = new Date()) {
  const jobs = await prisma.scheduledReportJob.findMany({
    where: {
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }]
    }
  });

  let sent = 0;
  for (const job of jobs) {
    const settings = await prisma.universitySettings.findUnique({ where: { universityId: job.universityId } });
    if (settings && !settings.monthlyReportEmailEnabled && job.recipientEmails.length === 0 && job.recipientRoles.length === 0) {
      continue;
    }
    const day = settings?.monthlyReportDayOfMonth ?? 1;
    if (now.getUTCDate() < day && job.nextRunAt == null) {
      // Wait until configured day on first schedule
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 8, 0, 0));
      if (next > now) {
        await prisma.scheduledReportJob.update({ where: { id: job.id }, data: { nextRunAt: next } });
        continue;
      }
    }

    const { start, end, label } = monthRange(now);
    const rows = await buildMonthlyQualityRows({
      universityId: job.universityId,
      facultyId: job.scopeType === ReportScopeType.FACULTY ? job.scopeId : null,
      departmentId: job.scopeType === ReportScopeType.DEPARTMENT ? job.scopeId : null,
      start,
      end
    });
    const csv = monthlyReportCsv(rows, label);
    const emails = await resolveReportRecipients(job.universityId, job.recipientRoles, job.recipientEmails);
    const scopeLabel =
      job.scopeType === ReportScopeType.UNIVERSITY
        ? "University"
        : job.scopeType === ReportScopeType.FACULTY
          ? "Faculty"
          : "Department";

    let ok = 0;
    for (const email of emails) {
      const status = await sendMonthlyReportEmail({ to: email, periodLabel: label, scopeLabel, csv });
      if (status === "SENT" || status === "SKIPPED") ok += 1;
    }

    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day, 8, 0, 0));
    await prisma.scheduledReportJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: now,
        nextRunAt: nextMonth,
        lastStatus: emails.length ? `sent:${ok}/${emails.length}` : "no_recipients",
        format: job.format === ReportExportFormat.PDF ? ReportExportFormat.PDF : ReportExportFormat.CSV
      }
    });
    sent += ok;
  }
  return { jobs: jobs.length, emailsSent: sent };
}

export async function ensureDefaultMonthlyJob(universityId: string) {
  const existing = await prisma.scheduledReportJob.findFirst({
    where: { universityId, scopeType: ReportScopeType.UNIVERSITY, cadence: "MONTHLY" }
  });
  if (existing) return existing;
  return prisma.scheduledReportJob.create({
    data: {
      universityId,
      scopeType: ReportScopeType.UNIVERSITY,
      cadence: "MONTHLY",
      format: ReportExportFormat.CSV,
      recipientRoles: [Role.VC, Role.HOD],
      enabled: true,
      nextRunAt: null
    }
  });
}
