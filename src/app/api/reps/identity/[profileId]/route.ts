import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";

type Params = { params: { profileId: string } };

export const GET = withAuth<Params>(async (request, { params, profile }) => {
  const reason = new URL(request.url).searchParams.get("reason");
  if (!reason || reason.length < 10) return badRequest("A lookup reason of at least 10 characters is required");
  const lookedUp = await prisma.profile.findUnique({ where: { id: params.profileId } });
  if (!lookedUp?.anonymousAlias) return json({ error: "Not found" }, { status: 404 });
  const identity = await prisma.sealedRepIdentity.findUnique({ where: { anonymousAlias: lookedUp.anonymousAlias } });
  if (!identity) return json({ error: "Not found" }, { status: 404 });
  await prisma.identityLookup.create({
    data: { performedById: profile.id, lookedUpProfileId: params.profileId, reason }
  });
  return json({ data: { realName: identity.realName, realEmail: identity.realEmail, realPhone: identity.realPhone } });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.HOD]);
