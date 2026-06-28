import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const { id } = await params;
  const notifications = await prisma.lecturerNotification.findMany({ where: { lecturerId: id }, orderBy: { sentAt: "desc" } });
  return json({ data: notifications });
});
