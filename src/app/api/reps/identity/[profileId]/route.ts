import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, profileScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ profileId: string }> };

export const GET = withAuth<Params>(async (request, { params, profile }) => {
  const { profileId } = await params;
  const reason = new URL(request.url).searchParams.get("reason");
  if (!reason || reason.length < 10) return badRequest("A lookup reason of at least 10 characters is required");
  const lookedUp = await prisma.profile.findFirst({ where: andWhere({ id: profileId, role: Role.CLASS_REP }, profileScope(profile)) });
  if (!lookedUp?.anonymousAlias) return json({ error: "Not found" }, { status: 404 });
  const identity = await prisma.sealedRepIdentity.findUnique({ where: { anonymousAlias: lookedUp.anonymousAlias } });
  if (!identity) return json({ error: "Not found" }, { status: 404 });
  await prisma.identityLookup.create({
    data: { performedById: profile.id, lookedUpProfileId: profileId, reason }
  });
  return json({ data: { realName: identity.realName, realEmail: identity.realEmail, realPhone: identity.realPhone } });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.HOD]);
