import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async () => {
  const flags = await prisma.flag.findMany({ include: { lecturer: true, report: { include: { course: true } } }, orderBy: { createdAt: "desc" } });
  return json({ data: flags });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER]);
