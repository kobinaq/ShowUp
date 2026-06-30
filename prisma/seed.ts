import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AidType,
  ArrivalStatus,
  FlagType,
  InteractiveLevel,
  OutlineType,
  PresenceStatus,
  PrismaClient,
  Role
} from "@prisma/client";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const universityId = "atu_university";
const password = process.env.SEED_USER_PASSWORD ?? "Password123!";

async function refreshPrismaConnection() {
  await prisma.$disconnect().catch(() => undefined);
  await prisma.$connect();
}

const faculties = [
  {
    id: "atu_fac_eng",
    name: "Faculty of Engineering",
    departments: [
      ["atu_dept_ceng", "Computer Engineering", "CENG"],
      ["atu_dept_eeng", "Electrical/Electronic Engineering", "EENG"],
      ["atu_dept_civil", "Civil Engineering", "CIV"]
    ]
  },
  {
    id: "atu_fac_abe",
    name: "Faculty of Applied Sciences",
    departments: [
      ["atu_dept_cs", "Computer Science", "CS"],
      ["atu_dept_stats", "Statistics", "STAT"],
      ["atu_dept_math", "Mathematics", "MATH"]
    ]
  },
  {
    id: "atu_fac_business",
    name: "Business School",
    departments: [
      ["atu_dept_acc", "Accounting and Finance", "ACCT"],
      ["atu_dept_mkt", "Marketing", "MKT"],
      ["atu_dept_proc", "Procurement and Supply Chain", "PROC"]
    ]
  },
  {
    id: "atu_fac_built",
    name: "Faculty of Built Environment",
    departments: [
      ["atu_dept_btech", "Building Technology", "BT"],
      ["atu_dept_estate", "Estate Management", "EST"],
      ["atu_dept_fashion", "Fashion Design and Textiles", "FDT"]
    ]
  }
] as const;

async function createAuthUser(email: string, displayName: string) {
  if (!supabaseUrl || !serviceKey) return { id: `seed-${email}` };
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { displayName }
  });
  if (error && !isExistingEmailError(error)) throw error;
  if (data.user) return data.user;

  const existing = await findAuthUserByEmail(supabase, email);
  if (!existing) throw new Error(`Could not find Supabase user for ${email}`);
  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { displayName }
  });
  if (updateError) throw updateError;
  return existing;
}

function isExistingEmailError(error: { message?: string; code?: string; status?: number }) {
  return (
    error.code === "email_exists" ||
    error.status === 422 ||
    /already.*registered|already.*exists/i.test(error.message ?? "")
  );
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (existing || data.users.length < 1000) return existing ?? null;
    page += 1;
  }
}

async function cleanupDemoData() {
  const courses = await prisma.course.findMany({ where: { id: { startsWith: "atu_course_" } }, select: { id: true } });
  const courseIds = courses.map((course) => course.id);
  const lecturers = await prisma.lecturer.findMany({ where: { id: { startsWith: "atu_lect_" } }, select: { id: true } });
  const lecturerIds = lecturers.map((lecturer) => lecturer.id);
  const reports = await prisma.lectureReport.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
  const reportIds = reports.map((report) => report.id);
  const outlines = await prisma.courseOutline.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
  const outlineIds = outlines.map((outline) => outline.id);

  await prisma.identityLookup.deleteMany({ where: { OR: [{ performedBy: { email: { endsWith: "@atu.showup.demo" } } }, { lookedUpProfile: { email: { endsWith: "@atu.showup.demo" } } }] } });
  await prisma.activityLog.deleteMany({ where: { universityId } });
  await prisma.rotationLog.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.lecturerNotification.deleteMany({ where: { lecturerId: { in: lecturerIds } } });
  await prisma.flag.deleteMany({ where: { OR: [{ lecturerId: { in: lecturerIds } }, { reportId: { in: reportIds } }] } });
  await prisma.contest.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.teachingAid.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.reportTopic.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.lectureReport.deleteMany({ where: { id: { in: reportIds } } });
  await prisma.repAssignment.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.sealedRepIdentity.deleteMany({ where: { anonymousAlias: { startsWith: "reporter_ATU_" } } });
  await prisma.outlineTopic.deleteMany({ where: { outlineId: { in: outlineIds } } });
  await prisma.courseOutline.deleteMany({ where: { id: { in: outlineIds } } });
  await prisma.classSchedule.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.profile.deleteMany({ where: { OR: [{ email: { endsWith: "@atu.showup.demo" } }, { anonymousAlias: { startsWith: "reporter_ATU_" } }] } });
  await prisma.lecturer.deleteMany({ where: { id: { in: lecturerIds } } });
  await prisma.department.deleteMany({ where: { id: { startsWith: "atu_dept_" } } });
  await prisma.faculty.deleteMany({ where: { id: { startsWith: "atu_fac_" } } });
  await prisma.semester.deleteMany({ where: { id: { startsWith: "atu_sem_" } } });
  await prisma.university.deleteMany({ where: { id: universityId } });
}

async function main() {
  await cleanupDemoData();
  await refreshPrismaConnection();

  const university = await prisma.university.create({
    data: {
      id: universityId,
      name: "Accra Technical University",
      address: "Barnes Road, Accra"
    }
  });

  const semester = await prisma.semester.create({
    data: {
      id: "atu_sem_2026_2027_1",
      name: "2026/2027 First Semester",
      startDate: new Date("2026-08-17T00:00:00.000Z"),
      endDate: new Date("2026-12-18T00:00:00.000Z"),
      isActive: true,
      universityId: university.id
    }
  });
  await prisma.universitySettings.create({
    data: {
      id: "atu_settings",
      universityId: university.id,
      latePingThresholdMinutes: 30,
      submissionWindowHours: 2,
      flagCoverageWeek6: 60,
      flagCoverageWeek10: 80,
      flagRepeatThreshold: 3,
      lecturerAbsenceSmsEnabled: true,
      lecturerAbsenceEmailEnabled: true,
      latePingSmsEnabled: true,
      latePingEmailEnabled: true,
      qaLatePingEmailEnabled: true,
      showUpAiEnabled: true
    }
  });

  const adminUser = await createAuthUser("admin@atu.showup.demo", "ATU Super Admin");
  const vcUser = await createAuthUser("vc@atu.showup.demo", "ATU Vice Chancellor");
  const qaUser = await createAuthUser("qa@atu.showup.demo", "ATU QA Officer");
  const qaAssistantUser = await createAuthUser("qa.assistant@atu.showup.demo", "ATU QA Assistant");
  const itUser = await createAuthUser("it@atu.showup.demo", "ATU IT Officer");
  const admin = await prisma.profile.create({
    data: { id: "atu_profile_admin", supabaseUid: adminUser.id, email: "admin@atu.showup.demo", displayName: "ATU Super Admin", role: Role.SUPER_ADMIN, universityId: university.id }
  });
  await prisma.profile.create({
    data: { id: "atu_profile_vc", supabaseUid: vcUser.id, email: "vc@atu.showup.demo", displayName: "ATU Vice Chancellor", role: Role.VC, universityId: university.id }
  });
  await prisma.profile.create({
    data: { id: "atu_profile_qa", supabaseUid: qaUser.id, email: "qa@atu.showup.demo", displayName: "ATU QA Officer", role: Role.QA_OFFICER, universityId: university.id }
  });
  await prisma.profile.create({
    data: { id: "atu_profile_qa_assistant", supabaseUid: qaAssistantUser.id, email: "qa.assistant@atu.showup.demo", displayName: "ATU QA Assistant", role: Role.QA_ASSISTANT, universityId: university.id }
  });
  await prisma.profile.create({
    data: { id: "atu_profile_it", supabaseUid: itUser.id, email: "it@atu.showup.demo", phone: "+233240001999", displayName: "ATU IT Officer", role: Role.IT, universityId: university.id }
  });

  const departmentRecords: Array<{ id: string; name: string; code: string; hodProfileId: string }> = [];
  for (const faculty of faculties) {
    await prisma.faculty.create({ data: { id: faculty.id, name: faculty.name, universityId: university.id } });
    for (const [id, name, code] of faculty.departments) {
      await prisma.department.create({ data: { id, name, facultyId: faculty.id } });
      const hodEmail = `hod.${code.toLowerCase()}@atu.showup.demo`;
      const hodUser = await createAuthUser(hodEmail, `${name} HOD`);
      const hod = await prisma.profile.create({
        data: {
          id: `atu_profile_hod_${code.toLowerCase()}`,
          supabaseUid: hodUser.id,
          email: hodEmail,
          phone: `+23324099${String(departmentRecords.length + 10).padStart(4, "0")}`,
          displayName: `${name} HOD`,
          role: Role.HOD,
          departmentId: id,
          universityId: university.id
        }
      });
      departmentRecords.push({ id, name, code, hodProfileId: hod.id });
    }
  }

  const firstNames = ["Akua", "Kwame", "Ama", "Kofi", "Esi", "Yaw", "Abena", "Kojo", "Efua", "Kwesi", "Adjoa", "Fiifi"];
  const lastNames = ["Mensah", "Boateng", "Asante", "Owusu", "Addo", "Darko", "Nyarko", "Appiah", "Agyemang", "Ofori", "Sarpong", "Quartey"];
  const allCourses: Array<{ id: string; scheduleId: string; scheduleEndTime: string; topicIds: string[]; lecturerId: string }> = [];

  for (const [deptIndex, dept] of departmentRecords.entries()) {
    const lecturers = [];
    for (let i = 0; i < 3; i++) {
      const lecturer = await prisma.lecturer.create({
        data: {
          id: `atu_lect_${dept.code.toLowerCase()}_${i + 1}`,
          firstName: firstNames[(deptIndex + i) % firstNames.length],
          lastName: lastNames[(deptIndex * 2 + i) % lastNames.length],
          email: `${dept.code.toLowerCase()}.lecturer${i + 1}@atu.edu.gh`,
          phone: `+233240${String(deptIndex).padStart(2, "0")}${String(i + 10).padStart(4, "0")}`,
          staffId: `ATU-${dept.code}-${100 + i}`,
          departmentId: dept.id
        }
      });
      lecturers.push(lecturer);
    }

    for (let i = 0; i < 2; i++) {
      const lecturer = lecturers[i % lecturers.length];
      const code = `${dept.code}${300 + i + 1}`;
      const course = await prisma.course.create({
        data: {
          id: `atu_course_${dept.code.toLowerCase()}_${i + 1}`,
          code,
          title: `${dept.name} Professional Practice ${i + 1}`,
          departmentId: dept.id,
          semesterId: semester.id,
          lecturerId: lecturer.id,
          creditHours: i === 0 ? 3 : 2,
          classSize: 55 + ((deptIndex + i) % 5) * 10,
          schedule: {
            create: {
              id: `atu_schedule_${dept.code.toLowerCase()}_${i + 1}`,
              dayOfWeek: ((deptIndex + i) % 5) + 1,
              startTime: i === 0 ? "08:00" : "13:00",
              endTime: i === 0 ? "10:00" : "15:00",
              venue: `${dept.code} Lab ${i + 1}`
            }
          }
        },
        include: { schedule: true }
      });
      const outline = await prisma.courseOutline.create({
        data: {
          id: `atu_outline_${dept.code.toLowerCase()}_${i + 1}`,
          courseId: course.id,
          fileUrl: "https://example.com/atu-course-outline.pdf",
          fileName: `${code}-outline.pdf`,
          outlineType: OutlineType.WEEKLY,
          uploadedById: dept.hodProfileId
        }
      });
      const topicIds = Array.from({ length: 12 }, (_, topicIndex) => `atu_topic_${dept.code.toLowerCase()}_${i + 1}_${topicIndex + 1}`);
      await prisma.outlineTopic.createMany({
        data: topicIds.map((id, topicIndex) => ({
          id,
          outlineId: outline.id,
          title: `${dept.name} Topic ${topicIndex + 1}`,
          description: `Week ${topicIndex + 1} competency for ${code}`,
          weekNumber: topicIndex + 1,
          order: topicIndex + 1
        }))
      });
      allCourses.push({ id: course.id, scheduleId: course.schedule[0].id, scheduleEndTime: course.schedule[0].endTime, topicIds, lecturerId: lecturer.id });
    }
  }

  for (const [index, course] of allCourses.slice(0, 18).entries()) {
    const alias = `reporter_ATU_${String(index + 1).padStart(2, "0")}`;
    const auth = await createAuthUser(`${alias}@showup.internal`, `ATU Reporter ${index + 1}`);
    const profile = await prisma.profile.create({
      data: {
        id: `atu_profile_rep_${index + 1}`,
        supabaseUid: auth.id,
        anonymousAlias: alias,
        role: Role.CLASS_REP,
        departmentId: (await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).departmentId,
        universityId: university.id
      }
    });
    await prisma.sealedRepIdentity.create({
      data: {
        id: `atu_identity_rep_${index + 1}`,
        supabaseUid: auth.id,
        anonymousAlias: alias,
        realName: `ATU Class Rep ${index + 1}`,
        realEmail: `rep${index + 1}@atu.edu.gh`,
        realPhone: `+23355000${String(index + 1).padStart(4, "0")}`,
        courseId: course.id
      }
    });
    await prisma.repAssignment.create({
      data: {
        id: `atu_assignment_${index + 1}`,
        courseId: course.id,
        profileId: profile.id,
        startDate: new Date("2026-08-17T00:00:00.000Z"),
        isActive: true,
        rotationOrder: index + 1,
        assignedById: admin.id
      }
    });
  }

  await refreshPrismaConnection();
  const reps = await prisma.profile.findMany({ where: { anonymousAlias: { startsWith: "reporter_ATU_" } } });
  for (const [courseIndex, course] of allCourses.entries()) {
    if (courseIndex > 0 && courseIndex % 4 === 0) await refreshPrismaConnection();
    const rep = reps[courseIndex % reps.length];
    for (let week = 1; week <= 8; week++) {
      const report = await prisma.lectureReport.create({
        data: {
          id: `atu_report_${courseIndex + 1}_${week}`,
          courseId: course.id,
          scheduleId: course.scheduleId,
          submittedById: rep.id,
          lectureDate: new Date(Date.UTC(2026, 7, 17 + week * 7 + (courseIndex % 5))),
          lecturerPresent: (courseIndex + week) % 11 === 0 ? PresenceStatus.ABSENT : PresenceStatus.PRESENT,
          arrivalStatus: (courseIndex + week) % 4 === 0 ? ArrivalStatus.LATE : ArrivalStatus.ON_TIME,
          lateMinutes: (courseIndex + week) % 4 === 0 ? 10 + (week % 4) * 5 : null,
          earlyDismissal: (courseIndex + week) % 9 === 0,
          dismissedEarlyMinutes: (courseIndex + week) % 9 === 0 ? 20 : null,
          previousTopicsRevisited: week % 2 === 0,
          wasInteractive: week % 3 === 0 ? InteractiveLevel.SOMEWHAT : InteractiveLevel.YES,
          studentCount: 42 + ((courseIndex + week) % 55),
          additionalNotes: week % 5 === 0 ? "Students requested more lab time for the topic." : null,
          windowClosedAt: seedWindowClosedAt(2026, 7, 17 + week * 7 + (courseIndex % 5), course.scheduleEndTime, 2),
          topicsCovered: {
            create: course.topicIds.slice(Math.max(0, week - 2), Math.min(course.topicIds.length, week + 1)).map((topicId) => ({ topicId }))
          },
          teachingAids: { create: [{ type: AidType.WHITEBOARD }, { type: week % 2 === 0 ? AidType.SLIDES : AidType.HANDOUTS }] }
        }
      });
      if ((courseIndex + week) % 11 === 0) {
        await prisma.flag.create({
          data: { id: `atu_flag_absence_${courseIndex + 1}_${week}`, lecturerId: course.lecturerId, reportId: report.id, type: FlagType.ABSENCE, message: "Lecturer was reported absent for this session." }
        });
      }
      if ((courseIndex + week) % 4 === 0) {
        await prisma.flag.create({
          data: { id: `atu_flag_late_${courseIndex + 1}_${week}`, lecturerId: course.lecturerId, reportId: report.id, type: FlagType.LATENESS, message: "Lecturer was reported late for this session." }
        });
      }
    }
  }

  const contestedReport = await prisma.lectureReport.findFirst({ where: { id: "atu_report_1_5" } });
  if (contestedReport) {
    await prisma.contest.create({
      data: {
        id: "atu_contest_1",
        reportId: contestedReport.id,
        raisedById: departmentRecords[0].hodProfileId,
        reason: "Lecturer provided attendance evidence for the session."
      }
    });
    await prisma.lectureReport.update({ where: { id: contestedReport.id }, data: { isContested: true } });
  }

  await prisma.activityLog.create({
    data: {
      id: "atu_activity_seed_completed",
      universityId: university.id,
      actorId: admin.id,
      action: "sample_data.loaded",
      metadata: { departments: departmentRecords.length, courses: allCourses.length, reports: allCourses.length * 8 }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

function seedWindowClosedAt(year: number, month: number, day: number, classEndTime: string, extraHours: number) {
  const [hour, minute] = classEndTime.split(":").map(Number);
  return new Date(Date.UTC(year, month, day, hour + extraHours, minute));
}
