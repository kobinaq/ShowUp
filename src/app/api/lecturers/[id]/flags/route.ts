import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const flags = await prisma.flag.findMany({ where: { lecturerId: params.id }, orderBy: { createdAt: "desc" } });
  return json({ data: flags });
});
