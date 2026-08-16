import { createClient } from "@supabase/supabase-js";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateAlias, generatePassword } from "@/lib/utils/aliasGenerator";
import { notificationService } from "@/lib/services/notification.service";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export function assignmentIsDue(
  assignment: { endDate: Date | null; startDate: Date; rotationWeeks: number },
  now: Date
) {
  if (assignment.endDate && assignment.endDate.getTime() <= now.getTime()) return true;
  const weeks = assignment.rotationWeeks > 0 ? assignment.rotationWeeks : 4;
  return assignment.startDate.getTime() <= now.getTime() - weeks * WEEK_MS;
}

export function nextSealedPerson<T extends { id: string; createdAt: Date }>(pool: T[], outgoingId?: string) {
  const people = [...pool].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (people.length === 0) return undefined;
  return people.find((person) => person.id !== outgoingId) ?? people[0];
}

export class RotationService {
  async rotateDueReps(now = new Date()) {
    const active = await prisma.repAssignment.findMany({
      where: { isActive: true },
      include: { profile: true }
    });
    const due = active.filter((assignment) => assignmentIsDue(assignment, now));
    const results = [];
    for (const assignment of due) {
      try {
        results.push(await this.rotateCourse(assignment.courseId, assignment.assignedById, assignment.id));
      } catch (error) {
        results.push({
          courseId: assignment.courseId,
          outgoingAlias: assignment.profile.anonymousAlias ?? null,
          incomingAlias: null,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return results;
  }

  async rotateCourse(courseId: string, assignedById: string, outgoingAssignmentId?: string) {
    const roster = await prisma.sealedRepIdentity.findMany({ where: { courseId }, orderBy: { createdAt: "asc" } });
    const activeAssignments = await prisma.repAssignment.findMany({
      where: { courseId, isActive: true },
      include: { profile: true },
      orderBy: { createdAt: "asc" }
    });
    const outgoingAssignment = outgoingAssignmentId
      ? activeAssignments.find((assignment) => assignment.id === outgoingAssignmentId)
      : activeAssignments[0];
    const outgoingAliasForLog = outgoingAssignment?.profile.anonymousAlias;
    const alias = generateAlias();
    const password = generatePassword();
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error("Course not found");
    const identity = nextSealedPerson(roster, outgoingAssignment?.sealedIdentityId);
    if (!identity) throw new Error("No sealed identities available for this course");

    const supabaseUid = await this.createSupabaseUser(`${alias}@showup.internal`, password);
    await prisma.$transaction(async (tx) => {
      if (outgoingAssignment) {
        await tx.repAssignment.update({ where: { id: outgoingAssignment.id }, data: { isActive: false, endDate: new Date() } });
        await tx.profile.update({ where: { id: outgoingAssignment.profileId }, data: { isActive: false } });
      }
      const maxOrder = await tx.repAssignment.aggregate({ where: { courseId }, _max: { rotationOrder: true } });
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
          sealedIdentityId: identity.id,
          assignedById,
          startDate: new Date(),
          rotationOrder: (maxOrder._max.rotationOrder ?? 0) + 1,
          rotationWeeks: outgoingAssignment?.rotationWeeks ?? 4,
          isActive: true
        }
      });
      await tx.rotationLog.create({
        data: { courseId, assignmentId: assignment.id, outgoingAlias: outgoingAliasForLog, incomingAlias: alias, action: "rotated" }
      });
    });
    await notificationService.sendRepCredentials(identity.realEmail, identity.realPhone, `${alias}@showup.internal`, password);
    return { courseId, outgoingAlias: outgoingAliasForLog, incomingAlias: alias };
  }

  private async createSupabaseUser(email: string, password: string) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase admin credentials are required to rotate reporter accounts");
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Supabase user creation failed");
    return data.user.id;
  }
}

export const rotationService = new RotationService();
