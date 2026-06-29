import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { andWhere, flagScope } from "@/lib/auth/scope";
import { badRequest, withAuth, json } from "@/lib/middleware/withAuth";
import { flagService } from "@/lib/services/flag.service";

type Params = { params: Promise<{ id: string }> };
const resolveFlagSchema = z.object({ internalNotes: z.string().max(1200).optional() });

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = resolveFlagSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid flag resolution payload", parsed.error.flatten());
  const existing = await prisma.flag.findFirst({ where: andWhere({ id }, flagScope(profile)), select: { id: true } });
  if (!existing) return json({ error: "Not found" }, { status: 404 });
  const flag = await flagService.resolve(id, parsed.data.internalNotes);
  return json({ data: flag });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER]);
