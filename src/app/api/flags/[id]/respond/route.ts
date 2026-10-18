import { FlagEventType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";

type Params = { params: Promise<{ id: string }> };

const respondSchema = z.object({
  action: z.enum(["ACKNOWLEDGED", "RESPONDED"]),
  note: z.string().max(1000).optional()
});

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = respondSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid response payload", parsed.error.flatten());

  const flag = await prisma.flag.findUnique({
    where: { id },
    include: { lecturer: { select: { id: true, profile: { select: { id: true } } } } }
  });
  if (!flag) return json({ error: "Not found" }, { status: 404 });

  const isOwn =
    profile.role === Role.LECTURER && profile.lecturerId === flag.lecturerId;
  const isStaff =
    profile.role === Role.SUPER_ADMIN ||
    profile.role === Role.QA_OFFICER ||
    profile.role === Role.QA_ASSISTANT ||
    profile.role === Role.HOD ||
    profile.role === Role.HOD_ASSISTANT;
  if (!isOwn && !isStaff) return forbidden("You cannot respond to this flag");

  const event = await prisma.flagEvent.create({
    data: {
      flagId: flag.id,
      type: parsed.data.action === "ACKNOWLEDGED" ? FlagEventType.ACKNOWLEDGED : FlagEventType.RESPONDED,
      actorId: profile.id,
      note: parsed.data.note ?? null
    }
  });

  return json({ data: event }, { status: 201 });
}, [Role.LECTURER, Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT]);
