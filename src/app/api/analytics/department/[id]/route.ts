import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const department = await prisma.department.findUnique({
    where: { id: params.id },
    include: { courses: { include: { reports: true, lecturer: true } } }
  });
  if (!department) return json({ error: "Not found" }, { status: 404 });
  return json({ data: department });
});
