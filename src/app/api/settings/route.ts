import { Role } from "@prisma/client";
import { z } from "zod";
import { badRequest, json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  latePingThresholdMinutes: z.coerce.number().int().min(15).max(60).refine((value) => value % 5 === 0, "Use 5 minute steps"),
  submissionWindowHours: z.coerce.number().int().min(1).max(6),
  flagCoverageWeek6: z.coerce.number().int().min(0).max(100),
  flagCoverageWeek10: z.coerce.number().int().min(0).max(100),
  flagRepeatThreshold: z.coerce.number().int().min(2).max(10),
  lecturerAbsenceSmsEnabled: z.boolean(),
  lecturerAbsenceEmailEnabled: z.boolean(),
  latePingSmsEnabled: z.boolean(),
  latePingEmailEnabled: z.boolean(),
  qaLatePingEmailEnabled: z.boolean(),
  showUpAiEnabled: z.boolean(),
  activeSemesterId: z.string().nullable().optional()
});

export const GET = withAuth(async (_request, { profile }) => {
  const [settings, activeSemester] = await Promise.all([
    prisma.universitySettings.upsert({
      where: { universityId: profile.universityId },
      update: {},
      create: { universityId: profile.universityId }
    }),
    prisma.semester.findFirst({ where: { universityId: profile.universityId, isActive: true }, select: { id: true } })
  ]);
  return json({ data: { ...settings, activeSemesterId: activeSemester?.id ?? null } });
}, [Role.QA_OFFICER]);

export const PUT = withAuth(async (request, { profile }) => {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid settings payload", parsed.error.flatten());
  const { activeSemesterId, ...settingsData } = parsed.data;

  if (activeSemesterId) {
    const semester = await prisma.semester.findFirst({ where: { id: activeSemesterId, universityId: profile.universityId }, select: { id: true } });
    if (!semester) return badRequest("Active semester is outside your university");
  }

  const settings = await prisma.$transaction(async (tx) => {
    if (activeSemesterId !== undefined) {
      await tx.semester.updateMany({ where: { universityId: profile.universityId }, data: { isActive: false } });
      if (activeSemesterId) {
        await tx.semester.update({ where: { id: activeSemesterId }, data: { isActive: true } });
      }
    }

    return tx.universitySettings.upsert({
      where: { universityId: profile.universityId },
      update: { ...settingsData, updatedById: profile.id },
      create: { universityId: profile.universityId, ...settingsData, updatedById: profile.id }
    });
  });
  return json({ data: { ...settings, activeSemesterId: activeSemesterId ?? null } });
}, [Role.QA_OFFICER]);
