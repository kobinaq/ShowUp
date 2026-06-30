import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { flagScope } from "@/lib/auth/scope";
import { withAuth, json } from "@/lib/middleware/withAuth";

export const GET = withAuth(async (_request, { profile }) => {
  const flags = await prisma.flag.findMany({ where: flagScope(profile), include: { lecturer: true, report: { include: { course: true } } }, orderBy: { createdAt: "desc" } });
  return json({ data: flags });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT]);
