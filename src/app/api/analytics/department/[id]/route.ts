import { prisma } from "@/lib/prisma";
import { andWhere, departmentScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const department = await prisma.department.findFirst({
    where: andWhere({ id }, departmentScope(profile)),
    include: { courses: { include: { reports: true, lecturer: true } } }
  });
  if (!department) return json({ error: "Not found" }, { status: 404 });
  return json({ data: department });
});
