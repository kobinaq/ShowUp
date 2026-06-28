import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const { id } = await params;
  const flags = await prisma.flag.findMany({ where: { lecturerId: id }, orderBy: { createdAt: "desc" } });
  return json({ data: flags });
});
