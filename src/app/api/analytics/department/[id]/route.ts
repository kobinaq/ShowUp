import { prisma } from "@/lib/prisma";
import { forbidden, withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  if ((profile.role === "HOD" || profile.role === "HOD_ASSISTANT") && profile.departmentId !== id) {
    return forbidden("HOD analytics are limited to their own department");
  }
  const department = await prisma.department.findUnique({
    where: { id },
    include: { courses: { include: { reports: true, lecturer: true } } }
  });
  if (!department) return json({ error: "Not found" }, { status: 404 });
  return json({ data: department });
});
