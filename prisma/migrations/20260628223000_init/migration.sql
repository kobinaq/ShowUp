-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'VC', 'QA_OFFICER', 'HOD', 'HOD_ASSISTANT', 'CLASS_REP');

-- CreateEnum
CREATE TYPE "OutlineType" AS ENUM ('WEEKLY', 'FLAT');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('PRESENT', 'ABSENT', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "ArrivalStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "InteractiveLevel" AS ENUM ('YES', 'SOMEWHAT', 'NO');

-- CreateEnum
CREATE TYPE "AidType" AS ENUM ('SLIDES', 'WHITEBOARD', 'HANDOUTS', 'VIDEO', 'NONE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('ABSENCE', 'LATENESS', 'EARLY_DISMISSAL', 'COVERAGE_LAG', 'REPEATED_ABSENCE', 'REPEATED_LATENESS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "anonymousAlias" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL,
    "departmentId" TEXT,
    "universityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SealedRepIdentity" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "anonymousAlias" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "realEmail" TEXT NOT NULL,
    "realPhone" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SealedRepIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecturer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "creditHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOutline" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "outlineType" "OutlineType" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseOutline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutlineTopic" (
    "id" TEXT NOT NULL,
    "outlineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekNumber" INTEGER,
    "order" INTEGER NOT NULL,

    CONSTRAINT "OutlineTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSchedule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT,

    CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rotationOrder" INTEGER NOT NULL,
    "assignedById" TEXT NOT NULL,
    "rotationWeeks" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureReport" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "lectureDate" TIMESTAMP(3) NOT NULL,
    "lecturerPresent" "PresenceStatus" NOT NULL,
    "substituteNote" TEXT,
    "arrivalStatus" "ArrivalStatus",
    "lateMinutes" INTEGER,
    "earlyDismissal" BOOLEAN NOT NULL DEFAULT false,
    "dismissedEarlyMinutes" INTEGER,
    "previousTopicsRevisited" BOOLEAN NOT NULL DEFAULT false,
    "wasInteractive" "InteractiveLevel" NOT NULL,
    "studentCount" INTEGER,
    "additionalNotes" TEXT,
    "isContested" BOOLEAN NOT NULL DEFAULT false,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowClosedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAid" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "AidType" NOT NULL,

    CONSTRAINT "TeachingAid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTopic" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "ReportTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "reportId" TEXT,
    "type" "FlagType" NOT NULL,
    "message" TEXT NOT NULL,
    "internalNotes" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerNotification" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "LecturerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityLookup" (
    "id" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "lookedUpProfileId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationLog" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "outgoingAlias" TEXT,
    "incomingAlias" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_supabaseUid_key" ON "Profile"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_anonymousAlias_key" ON "Profile"("anonymousAlias");

-- CreateIndex
CREATE UNIQUE INDEX "SealedRepIdentity_supabaseUid_key" ON "SealedRepIdentity"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "SealedRepIdentity_anonymousAlias_key" ON "SealedRepIdentity"("anonymousAlias");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_email_key" ON "Lecturer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_staffId_key" ON "Lecturer"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_semesterId_key" ON "Course"("code", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOutline_courseId_key" ON "CourseOutline"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LectureReport_scheduleId_lectureDate_key" ON "LectureReport"("scheduleId", "lectureDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTopic_reportId_topicId_key" ON "ReportTopic"("reportId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_reportId_key" ON "Contest"("reportId");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOutline" ADD CONSTRAINT "CourseOutline_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOutline" ADD CONSTRAINT "CourseOutline_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlineTopic" ADD CONSTRAINT "OutlineTopic_outlineId_fkey" FOREIGN KEY ("outlineId") REFERENCES "CourseOutline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepAssignment" ADD CONSTRAINT "RepAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepAssignment" ADD CONSTRAINT "RepAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureReport" ADD CONSTRAINT "LectureReport_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureReport" ADD CONSTRAINT "LectureReport_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureReport" ADD CONSTRAINT "LectureReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAid" ADD CONSTRAINT "TeachingAid_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LectureReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTopic" ADD CONSTRAINT "ReportTopic_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LectureReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTopic" ADD CONSTRAINT "ReportTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "OutlineTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LectureReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LectureReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerNotification" ADD CONSTRAINT "LecturerNotification_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityLookup" ADD CONSTRAINT "IdentityLookup_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityLookup" ADD CONSTRAINT "IdentityLookup_lookedUpProfileId_fkey" FOREIGN KEY ("lookedUpProfileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationLog" ADD CONSTRAINT "RotationLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RepAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

