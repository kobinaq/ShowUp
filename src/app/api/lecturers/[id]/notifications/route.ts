import { prisma } from "@/lib/prisma";
import { andWhere, lecturerScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const lecturer = await prisma.lecturer.findFirst({ where: andWhere({ id }, lecturerScope(profile)), select: { id: true } });
  if (!lecturer) return json({ error: "Not found" }, { status: 404 });
  const notifications = await prisma.lecturerNotification.findMany({ where: { lecturerId: id }, orderBy: { sentAt: "desc" } });
  return json({ data: notifications });
});
