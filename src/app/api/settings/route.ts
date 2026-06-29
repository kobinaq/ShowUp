import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  latePingThresholdMinutes: z.coerce.number().int().min(15).max(60).refine((value) => value % 5 === 0, "Use 5 minute steps")
});

export const GET = withAuth(async (_request, { profile }) => {
  const settings = await prisma.universitySettings.upsert({
    where: { universityId: profile.universityId },
    update: {},
    create: { universityId: profile.universityId }
  });
  return json({ data: settings });
}, [Role.QA_OFFICER]);

export const PUT = withAuth(async (request, { profile }) => {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid settings payload", parsed.error.flatten());
  const settings = await prisma.universitySettings.upsert({
    where: { universityId: profile.universityId },
    update: { latePingThresholdMinutes: parsed.data.latePingThresholdMinutes, updatedById: profile.id },
    create: { universityId: profile.universityId, latePingThresholdMinutes: parsed.data.latePingThresholdMinutes, updatedById: profile.id }
  });
  return json({ data: settings });
}, [Role.QA_OFFICER]);
