import { createClient } from "@supabase/supabase-js";
import { PrismaClient, Role, PresenceStatus, ArrivalStatus, InteractiveLevel, AidType, OutlineType, FlagType } from "@prisma/client";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createAuthUser(email: string, password: string, displayName: string) {
  if (!supabaseUrl || !serviceKey) {
    return { id: `seed-${email}` };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { displayName }
  });
  if (error && !error.message.includes("already registered")) throw error;
  if (data.user) return data.user;

  const { data: listed } = await supabase.auth.admin.listUsers();
  const existing = listed.users.find((user) => user.email === email);
  if (!existing) throw new Error(`Could not find Supabase user for ${email}`);
  return existing;
}

async function main() {
  await prisma.$transaction([
    prisma.identityLookup.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.rotationLog.deleteMany(),
    prisma.lecturerNotification.deleteMany(),
    prisma.flag.deleteMany(),
    prisma.contest.deleteMany(),
    prisma.teachingAid.deleteMany(),
    prisma.reportTopic.deleteMany(),
    prisma.lectureReport.deleteMany(),
    prisma.repAssignment.deleteMany(),
    prisma.sealedRepIdentity.deleteMany(),
    prisma.outlineTopic.deleteMany(),
    prisma.courseOutline.deleteMany(),
    prisma.classSchedule.deleteMany(),
    prisma.course.deleteMany(),
    prisma.lecturer.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.semester.deleteMany(),
    prisma.department.deleteMany(),
    prisma.faculty.deleteMany(),
    prisma.university.deleteMany()
  ]);

  const university = await prisma.university.create({
    data: { name: "University of Ghana", address: "Legon, Accra" }
  });
  const science = await prisma.faculty.create({ data: { name: "Science", universityId: university.id } });
  const arts = await prisma.faculty.create({ data: { name: "Arts", universityId: university.id } });
  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Computer Science", facultyId: science.id } }),
    prisma.department.create({ data: { name: "Mathematics", facultyId: science.id } }),
    prisma.department.create({ data: { name: "English", facultyId: arts.id } }),
    prisma.department.create({ data: { name: "History", facultyId: arts.id } })
  ]);
  const semester = await prisma.semester.create({
    data: {
      name: "2026/2027 First Semester",
      startDate: new Date("2026-08-17T00:00:00.000Z"),
      endDate: new Date("2026-12-18T00:00:00.000Z"),
      isActive: true,
      universityId: university.id
    }
  });

  const users = [
    ["admin@showup.app", "SUPER_ADMIN", "Super Admin", departments[0].id],
    ["vc@showup.app", "VC", "Vice Chancellor", null],
    ["qa@showup.app", "QA_OFFICER", "QA Officer", null],
    ["hod.cs@showup.app", "HOD", "CS HOD", departments[0].id],
    ["hod.math@showup.app", "HOD", "Math HOD", departments[1].id]
  ] as const;
  const profiles = new Map<string, string>();
  for (const [email, role, displayName, departmentId] of users) {
    const user = await createAuthUser(email, "Password123!", displayName);
    const profile = await prisma.profile.create({
      data: {
        supabaseUid: user.id,
        displayName,
        email,
        role: role as Role,
        departmentId,
        universityId: university.id
      }
    });
    profiles.set(email, profile.id);
  }

  const lecturers = await Promise.all(
    departments.flatMap((department, deptIndex) =>
      [0, 1].map((index) =>
        prisma.lecturer.create({
          data: {
            firstName: ["Ama", "Kofi", "Esi", "Kwame", "Akua", "Yaw", "Abena", "Kojo"][deptIndex * 2 + index],
            lastName: ["Mensah", "Boateng", "Asante", "Owusu", "Addo", "Darko", "Nyarko", "Appiah"][deptIndex * 2 + index],
            email: `lecturer${deptIndex}${index}@showup.app`,
            phone: `+2332400000${deptIndex}${index}`,
            staffId: `UG-${deptIndex}${index}`,
            departmentId: department.id
          }
        })
      )
    )
  );

  for (const [departmentIndex, department] of departments.entries()) {
    for (let i = 0; i < 2; i++) {
      const lecturer = lecturers[departmentIndex * 2 + i];
      const course = await prisma.course.create({
        data: {
          code: `${["CS", "MATH", "ENGL", "HIST"][departmentIndex]}${301 + i}`,
          title: `${department.name} Seminar ${i + 1}`,
          departmentId: department.id,
          semesterId: semester.id,
          lecturerId: lecturer.id,
          creditHours: 3,
          schedule: {
            create: {
              dayOfWeek: i,
              startTime: "08:00",
              endTime: "10:00",
              venue: `Room ${departmentIndex + 1}${i + 1}`
            }
          }
        },
        include: { schedule: true }
      });
      const outline = await prisma.courseOutline.create({
        data: {
          courseId: course.id,
          fileUrl: "https://example.com/outline.pdf",
          fileName: `${course.code}-outline.pdf`,
          outlineType: OutlineType.WEEKLY,
          uploadedById: profiles.get(departmentIndex < 2 ? "hod.cs@showup.app" : "hod.math@showup.app") ?? profiles.get("admin@showup.app")!
        }
      });
      await prisma.outlineTopic.createMany({
        data: Array.from({ length: 12 }, (_, index) => ({
          outlineId: outline.id,
          title: `Topic ${index + 1}`,
          weekNumber: index + 1,
          order: index + 1
        }))
      });
    }
  }

  const courses = await prisma.course.findMany({ include: { schedule: true, outline: { include: { topics: true } } } });
  for (let i = 0; i < 3; i++) {
    const alias = `reporter_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const auth = await createAuthUser(`${alias}@showup.internal`, "Reporter123!", `Reporter ${i + 1}`);
    const profile = await prisma.profile.create({
      data: {
        supabaseUid: auth.id,
        anonymousAlias: alias,
        role: Role.CLASS_REP,
        departmentId: courses[i].departmentId,
        universityId: university.id
      }
    });
    await prisma.sealedRepIdentity.create({
      data: {
        supabaseUid: auth.id,
        anonymousAlias: alias,
        realName: `Student Reporter ${i + 1}`,
        realEmail: `student${i + 1}@example.com`,
        realPhone: `+23355000000${i}`,
        courseId: courses[i].id
      }
    });
    await prisma.repAssignment.create({
      data: {
        courseId: courses[i].id,
        profileId: profile.id,
        startDate: new Date(),
        isActive: true,
        rotationOrder: i + 1,
        assignedById: profiles.get("hod.cs@showup.app")!
      }
    });
  }

  const reps = await prisma.profile.findMany({ where: { role: Role.CLASS_REP } });
  for (let i = 0; i < 10; i++) {
    const course = courses[i % courses.length];
    const rep = reps[i % reps.length];
    const report = await prisma.lectureReport.create({
      data: {
        courseId: course.id,
        scheduleId: course.schedule[0].id,
        submittedById: rep.id,
        lectureDate: new Date(Date.now() - i * 86400000),
        lecturerPresent: i % 5 === 0 ? PresenceStatus.ABSENT : PresenceStatus.PRESENT,
        arrivalStatus: i % 3 === 0 ? ArrivalStatus.LATE : ArrivalStatus.ON_TIME,
        lateMinutes: i % 3 === 0 ? 12 : null,
        earlyDismissal: i % 4 === 0,
        dismissedEarlyMinutes: i % 4 === 0 ? 15 : null,
        previousTopicsRevisited: i % 2 === 0,
        wasInteractive: i % 2 === 0 ? InteractiveLevel.YES : InteractiveLevel.SOMEWHAT,
        studentCount: 80 - i,
        windowClosedAt: new Date(Date.now() + 7200000),
        topicsCovered: {
          create: course.outline?.topics.slice(0, Math.min(3, course.outline.topics.length)).map((topic) => ({
            topicId: topic.id
          })) ?? []
        },
        teachingAids: { create: [{ type: AidType.WHITEBOARD }, { type: AidType.SLIDES }] }
      }
    });
    if (i === 0) {
      await prisma.contest.create({
        data: {
          reportId: report.id,
          raisedById: profiles.get("hod.cs@showup.app")!,
          reason: "Lecturer submitted evidence that class was held."
        }
      });
      await prisma.lectureReport.update({ where: { id: report.id }, data: { isContested: true } });
    }
  }

  const firstLecturer = lecturers[0];
  await prisma.flag.createMany({
    data: [
      { lecturerId: firstLecturer.id, type: FlagType.ABSENCE, message: "Reported absent for CS301." },
      { lecturerId: firstLecturer.id, type: FlagType.COVERAGE_LAG, message: "Course coverage is behind expected pace." }
    ]
  });

  await prisma.activityLog.create({
    data: {
      universityId: university.id,
      actorId: profiles.get("admin@showup.app"),
      action: "seed.completed",
      metadata: { courses: courses.length }
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
