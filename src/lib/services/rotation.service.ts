import { createClient } from "@supabase/supabase-js";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateAlias, generatePassword } from "@/lib/utils/aliasGenerator";
import { notificationService } from "@/lib/services/notification.service";

export class RotationService {
  async rotateDueReps(now = new Date()) {
    const due = await prisma.repAssignment.findMany({
      where: {
        isActive: true,
        OR: [{ endDate: { lte: now } }, { startDate: { lte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7 * 4) } }]
      },
      include: { profile: true, course: true }
    });

    const results = [];
    for (const assignment of due) {
      results.push(await this.rotateCourse(assignment.courseId, assignment.assignedById, assignment.profile.anonymousAlias ?? undefined));
    }
    return results;
  }

  async rotateCourse(courseId: string, assignedById: string, outgoingAlias?: string) {
    const sealedPool = await prisma.sealedRepIdentity.findMany({ where: { courseId }, orderBy: { createdAt: "asc" } });
    const alias = generateAlias();
    const password = generatePassword();
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error("Course not found");
    const identity = sealedPool.find((item) => item.anonymousAlias !== outgoingAlias) ?? sealedPool[0];
    if (!identity) throw new Error("No sealed identities available for this course");

    const supabaseUid = await this.createSupabaseUser(`${alias}@showup.internal`, password);
    await prisma.$transaction(async (tx) => {
      await tx.repAssignment.updateMany({ where: { courseId, isActive: true }, data: { isActive: false, endDate: new Date() } });
      await tx.profile.updateMany({ where: { anonymousAlias: outgoingAlias }, data: { isActive: false } });
      const profile = await tx.profile.create({
        data: {
          supabaseUid,
          anonymousAlias: alias,
          role: Role.CLASS_REP,
          departmentId: course.departmentId,
          universityId: (await tx.semester.findUniqueOrThrow({ where: { id: course.semesterId } })).universityId
        }
      });
      const assignment = await tx.repAssignment.create({
        data: {
          courseId,
          profileId: profile.id,
          assignedById,
          startDate: new Date(),
          rotationOrder: 1,
          isActive: true
        }
      });
      await tx.sealedRepIdentity.create({
        data: {
          supabaseUid,
          anonymousAlias: alias,
          realName: identity.realName,
          realEmail: identity.realEmail,
          realPhone: identity.realPhone,
          courseId
        }
      });
      await tx.rotationLog.create({
        data: { courseId, assignmentId: assignment.id, outgoingAlias, incomingAlias: alias, action: "rotated" }
      });
    });
    await notificationService.sendRepCredentials(identity.realEmail, identity.realPhone, `${alias}@showup.internal`, password);
    return { courseId, outgoingAlias, incomingAlias: alias };
  }

  private async createSupabaseUser(email: string, password: string) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return `local-${email}`;
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Supabase user creation failed");
    return data.user.id;
  }
}

export const rotationService = new RotationService();
