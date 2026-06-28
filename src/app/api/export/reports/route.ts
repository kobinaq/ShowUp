import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware/withAuth";
import { exportService } from "@/lib/services/export.service";

export const GET = withAuth(async () => {
  const reports = await prisma.lectureReport.findMany({ include: { course: true, flags: true }, orderBy: { lectureDate: "desc" } });
  const csv = exportService.reportsCsv(
    reports.map((report) => ({
      date: report.lectureDate.toISOString(),
      course: report.course.code,
      presence: report.lecturerPresent,
      lateMinutes: report.lateMinutes ?? "",
      flags: report.flags.length
    }))
  );
  return new Response(csv, {
    headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=showup-reports.csv" }
  });
});
