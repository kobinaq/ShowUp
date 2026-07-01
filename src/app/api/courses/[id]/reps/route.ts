import { createClient } from "@supabase/supabase-js";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { withAuth, json, badRequest } from "@/lib/middleware/withAuth";
import { createRepSchema } from "@/lib/validators/rep";
import { generateAlias, generatePassword } from "@/lib/utils/aliasGenerator";
import { notificationService } from "@/lib/services/notification.service";
import { rotationService } from "@/lib/services/rotation.service";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const course = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  const reps = await prisma.repAssignment.findMany({
    where: { courseId: id },
    include: { profile: { select: { anonymousAlias: true, isActive: true, createdAt: true } } },
    orderBy: { createdAt: "desc" }
  });
  return json({ data: reps });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT]);

export const POST = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const parsed = createRepSchema.safeParse({ ...(await request.json()), courseId: id });
  if (!parsed.success) return badRequest("Invalid rep payload", parsed.error.flatten());
  const course = await prisma.course.findFirst({
    where: andWhere({ id }, courseScope(profile)),
    include: { semester: true }
  });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  const activeReporterCount = await prisma.repAssignment.count({ where: { courseId: id, isActive: true } });
  if (activeReporterCount >= 2) {
    return json({ error: "This course already has two active reporters. Deactivate one before assigning another." }, { status: 409 });
  }
  const alias = generateAlias();
  const password = generatePassword();
  const email = `${alias}@showup.internal`;
  const supabaseUid = await createAuthUser(email, password).catch((error) => {
    console.error(error);
    return null;
  });
  if (!supabaseUid) return json({ error: "Reporter auth account could not be created. Check Supabase admin credentials." }, { status: 503 });
  const saved = await prisma.$transaction(async (tx) => {
    const repProfile = await tx.profile.create({
      data: { supabaseUid, anonymousAlias: alias, role: Role.CLASS_REP, departmentId: course.departmentId, universityId: course.semester.universityId }
    });
    await tx.sealedRepIdentity.create({
      data: { supabaseUid, anonymousAlias: alias, realName: parsed.data.realName, realEmail: parsed.data.realEmail, realPhone: parsed.data.realPhone, courseId: id }
    });
    return tx.repAssignment.create({
      data: {
        courseId: id,
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
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT]);

export const DELETE = withAuth<Params>(async (request, { params, profile }) => {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : "";
  if (!assignmentId) return badRequest("Assignment ID is required");
  const assignment = await prisma.repAssignment.findFirst({
    where: { id: assignmentId, courseId: id },
    include: { profile: true, course: true }
  });
  if (!assignment) return json({ error: "Not found" }, { status: 404 });
  const course = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.repAssignment.update({
      where: { id: assignment.id },
      data: { isActive: false, endDate: new Date() }
    });
    await tx.profile.update({
      where: { id: assignment.profileId },
      data: { isActive: false }
    });
  });
  return json({ data: { id: assignment.id, isActive: false } });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT]);

export const PUT = withAuth<Params>(async (_request, { params, profile }) => {
  const { id } = await params;
  const course = await prisma.course.findFirst({ where: andWhere({ id }, courseScope(profile)), select: { id: true } });
  if (!course) return json({ error: "Not found" }, { status: 404 });
  const result = await rotationService.rotateCourse(id, profile.id);
  return json({ data: result });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT]);

async function createAuthUser(email: string, password: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase admin credentials are required to create reporter accounts");
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("Supabase user creation failed");
  return data.user.id;
}
