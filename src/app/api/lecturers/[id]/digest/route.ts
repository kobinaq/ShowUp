import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { andWhere, lecturerScope } from "@/lib/auth/scope";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };
const digestSchema = z.object({ digestEmailEnabled: z.boolean() });

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = digestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid digest setting", parsed.error.flatten());
  const existing = await prisma.lecturer.findFirst({ where: andWhere({ id }, lecturerScope(profile)), select: { id: true } });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  const lecturer = await prisma.lecturer.update({
    where: { id },
    data: { digestEmailEnabled: parsed.data.digestEmailEnabled }
  });
  return json({ data: { id: lecturer.id, digestEmailEnabled: lecturer.digestEmailEnabled } });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT]);
