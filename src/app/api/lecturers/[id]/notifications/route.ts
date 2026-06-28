import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const notifications = await prisma.lecturerNotification.findMany({ where: { lecturerId: params.id }, orderBy: { sentAt: "desc" } });
  return json({ data: notifications });
});
