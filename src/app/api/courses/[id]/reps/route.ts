import { createClient } from "@supabase/supabase-js";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { createRepSchema } from "@/lib/validators/rep";
import { generateAlias, generatePassword } from "@/lib/utils/aliasGenerator";
import { notificationService } from "@/lib/services/notification.service";
import { rotationService } from "@/lib/services/rotation.service";

type Params = { params: { id: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  const reps = await prisma.repAssignment.findMany({
    where: { courseId: params.id },
    include: { profile: { select: { anonymousAlias: true, isActive: true, createdAt: true } } },
    orderBy: { createdAt: "desc" }
  });
  return json({ data: reps });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const parsed = createRepSchema.safeParse({ ...(await request.json()), courseId: params.id });
  if (!parsed.success) return badRequest("Invalid rep payload", parsed.error.flatten());
  const alias = generateAlias();
  const password = generatePassword();
  const email = `${alias}@showup.internal`;
  const supabaseUid = await createAuthUser(email, password);
  const course = await prisma.course.findUniqueOrThrow({ where: { id: params.id }, include: { semester: true } });
  const saved = await prisma.$transaction(async (tx) => {
    await tx.repAssignment.updateMany({ where: { courseId: params.id, isActive: true }, data: { isActive: false, endDate: new Date() } });
    const repProfile = await tx.profile.create({
      data: { supabaseUid, anonymousAlias: alias, role: Role.CLASS_REP, departmentId: course.departmentId, universityId: course.semester.universityId }
    });
    await tx.sealedRepIdentity.create({
      data: { supabaseUid, anonymousAlias: alias, realName: parsed.data.realName, realEmail: parsed.data.realEmail, realPhone: parsed.data.realPhone, courseId: params.id }
    });
    return tx.repAssignment.create({
      data: {
        courseId: params.id,
        profileId: repProfile.id,
        assignedById: profile.id,
        startDate: new Date(),
        rotationOrder: parsed.data.rotationOrder,
        rotationWeeks: parsed.data.rotationWeeks,
        isActive: true
      }
    });
  });
  await notificationService.sendRepCredentials(parsed.data.realEmail, parsed.data.realPhone, email, password);
  return json({ data: saved, alias }, { status: 201 });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);

export const PUT = withAuth<Params>(async (_request, { params, profile }) => {
  const result = await rotationService.rotateCourse(params.id, profile.id);
  return json({ data: result });
}, [Role.SUPER_ADMIN, Role.HOD, Role.HOD_ASSISTANT]);

async function createAuthUser(email: string, password: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return `local-${email}`;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("Supabase user creation failed");
  return data.user.id;
}
