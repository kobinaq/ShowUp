import { Role } from "@prisma/client";
import { json, withAuth } from "@/lib/middleware/withAuth";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_request, { profile }) => {
  const settings = await prisma.universitySettings.upsert({
    where: { universityId: profile.universityId },
    update: { setupWizardCompletedAt: new Date(), updatedById: profile.id },
    create: {
      universityId: profile.universityId,
      setupWizardCompletedAt: new Date(),
      updatedById: profile.id
    }
  });
  return json({ data: { setupWizardCompletedAt: settings.setupWizardCompletedAt } });
}, [Role.SUPER_ADMIN, Role.IT]);
