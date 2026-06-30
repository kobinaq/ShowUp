import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({ isActive: z.boolean() });

export const PUT = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid profile status", parsed.error.flatten());
  if (id === profile.id && parsed.data.isActive === false) return badRequest("You cannot deactivate your own account.");
  const target = await prisma.profile.findFirst({
    where: profile.role === Role.SUPER_ADMIN ? { id } : { id, universityId: profile.universityId },
    select: { id: true, role: true, universityId: true }
  });
  if (!target) return json({ error: "Not found" }, { status: 404 });
  if (profile.role === Role.IT && target.role === Role.SUPER_ADMIN) return forbidden("IT cannot manage Super Admin accounts.");
  const updated = await prisma.profile.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true }
  });
  await prisma.activityLog.create({
    data: {
      universityId: target.universityId,
      actorId: profile.id,
      action: parsed.data.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      metadata: { profileId: id }
    }
  });
  return json({ data: updated });
}, [Role.SUPER_ADMIN, Role.IT]);
