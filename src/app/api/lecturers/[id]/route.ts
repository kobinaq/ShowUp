import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { id: params.id },
    include: { department: true, courses: true, flags: true, notifications: true }
  });
  return lecturer ? json({ data: lecturer }) : json({ error: "Not found" }, { status: 404 });
});

export const PUT = withAuth<Params>(async (request, { params }) => {
  const lecturer = await prisma.lecturer.update({ where: { id: params.id }, data: await request.json() });
  return json({ data: lecturer });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
