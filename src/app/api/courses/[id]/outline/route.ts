import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { outlineSchema } from "@/lib/validators/course";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const outline = await prisma.courseOutline.findUnique({ where: { courseId: params.id }, include: { topics: { orderBy: { order: "asc" } } } });
  return json({ data: outline });
});

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const parsed = outlineSchema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Invalid outline payload", parsed.error.flatten());
  const { topics, ...outline } = parsed.data;
  const saved = await prisma.courseOutline.upsert({
    where: { courseId: params.id },
    update: { ...outline, topics: { deleteMany: {}, create: topics } },
    create: { ...outline, courseId: params.id, uploadedById: profile.id, topics: { create: topics } },
    include: { topics: true }
  });
  return json({ data: saved }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);
