import { prisma } from "@/lib/prisma";

export function personOnAssignment<T>(assignment: { sealedIdentity: T } | null | undefined) {
  return assignment?.sealedIdentity ?? null;
}

export async function sealedIdentityForProfile(profileId: string) {
  const assignment = await prisma.repAssignment.findFirst({
    where: { profileId },
    include: { sealedIdentity: true },
    orderBy: { createdAt: "desc" }
  });
  return personOnAssignment(assignment);
}
