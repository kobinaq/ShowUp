import { PresenceStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { badRequest, forbidden, json, withAuth } from "@/lib/middleware/withAuth";
import { confirmLectureSession, sessionConfirmRoles } from "@/lib/services/session-confirmation";

type Params = { params: Promise<{ id: string }> };

const confirmSchema = z.object({
  presence: z.nativeEnum(PresenceStatus),
  note: z.string().max(500).optional().nullable()
});

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = confirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid confirmation payload", parsed.error.flatten());

  const session = await prisma.lectureSession.findFirst({
    where: { id },
    include: { course: { select: { id: true, departmentId: true } } }
  });
  if (!session) return json({ error: "Not found" }, { status: 404 });

  const scoped = await prisma.course.findFirst({
    where: andWhere({ id: session.courseId }, courseScope(profile)),
    select: { id: true }
  });
  if (!scoped) return forbidden("Session is outside your scope");

  if (profile.role === Role.LECTURER) {
    if (!profile.lecturerId) return forbidden("Lecturer profile is not linked to a Lecturer record");
    const linked = await prisma.course.findFirst({
      where: { id: session.courseId, lecturerId: profile.lecturerId },
      select: { id: true }
    });
    if (!linked) return forbidden("Lecturers can only confirm their own sessions");
  }

  const result = await confirmLectureSession({
    lectureSessionId: session.id,
    confirmedById: profile.id,
    presence: parsed.data.presence,
    note: parsed.data.note
  });
  if ("error" in result) return json({ error: result.error }, { status: 404 });
  return json({ data: result }, { status: 201 });
}, sessionConfirmRoles);
