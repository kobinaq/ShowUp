import { Role } from "@prisma/client";
import { z } from "zod";
import { withAuth, badRequest, json } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";
import {
  buildMonthlyQualityRows,
  monthRange,
  monthlyReportCsv,
  monthlyReportExcelXml,
  monthlyReportPdf
} from "@/lib/services/monthly-report.service";

const querySchema = z.object({
  format: z.enum(["csv", "pdf", "xlsx"]).default("csv"),
  facultyId: z.string().optional(),
  departmentId: z.string().optional()
});

export const GET = withAuth(async (request, { profile }) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    format: url.searchParams.get("format") ?? "csv",
    facultyId: url.searchParams.get("facultyId") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined
  });
  if (!parsed.success) return badRequest("Invalid monthly export query", parsed.error.flatten());

  const { start, end, label } = monthRange();
  const rows = await buildMonthlyQualityRows({
    universityId: profile.universityId,
    facultyId: parsed.data.facultyId,
    departmentId: parsed.data.departmentId,
    start,
    end
  });

  const scopeLabel =
    parsed.data.departmentId || parsed.data.facultyId
      ? "Selected faculty/department"
      : (await prisma.university.findUnique({ where: { id: profile.universityId }, select: { name: true } }))?.name ??
        "University";

  if (parsed.data.format === "pdf") {
    const pdf = monthlyReportPdf(rows, label, scopeLabel);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="meridiqa-monthly-${label.replace(/\s+/g, "-").toLowerCase()}.pdf"`
      }
    });
  }

  if (parsed.data.format === "xlsx") {
    const xml = monthlyReportExcelXml(rows, label);
    return new Response(xml, {
      headers: {
        "content-type": "application/vnd.ms-excel",
        "content-disposition": `attachment; filename="meridiqa-monthly-${label.replace(/\s+/g, "-").toLowerCase()}.xls"`
      }
    });
  }

  const csv = monthlyReportCsv(rows, label);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="meridiqa-monthly-${label.replace(/\s+/g, "-").toLowerCase()}.csv"`
    }
  });
}, [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT, Role.IT]);

export const POST = withAuth(async (_request, { profile }) => {
  // Preview JSON for UI panels
  const { start, end, label } = monthRange();
  const rows = await buildMonthlyQualityRows({
    universityId: profile.universityId,
    start,
    end
  });
  return json({ data: { period: label, rows } });
}, [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT, Role.IT]);
