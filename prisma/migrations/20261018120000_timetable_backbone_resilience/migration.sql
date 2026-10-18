-- Stage 1: Timetable backbone + resilience (additive only)

-- AlterEnum / CreateEnum
CREATE TYPE "LectureSessionStatus" AS ENUM (
  'SCHEDULED',
  'ON_TIME',
  'DELAYED',
  'ROOM_CHANGED',
  'RESCHEDULED',
  'CANCELLED_WITH_NOTICE',
  'CANCELLED_NO_NOTICE',
  'MAKE_UP'
);

CREATE TYPE "SessionDisruptionReason" AS ENUM (
  'ROOM_NOT_READY',
  'POWER_PROJECTOR',
  'LECTURER_EMERGENCY',
  'UNIVERSITY_EVENT',
  'OTHER'
);

CREATE TYPE "BlackoutType" AS ENUM (
  'HOLIDAY',
  'EXAM_WEEK',
  'STRIKE',
  'CLOSURE',
  'OTHER'
);

CREATE TYPE "FacilitiesIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- UniversitySettings: grace window before a lecture counts as late
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "lateGraceMinutes" INTEGER NOT NULL DEFAULT 10;

-- Flag: facilities attribution (scorecards exclude these from lecturer punctuality blame)
ALTER TABLE "Flag" ADD COLUMN IF NOT EXISTS "attributedToFacilities" BOOLEAN NOT NULL DEFAULT false;

-- Room
CREATE TABLE IF NOT EXISTS "Room" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "building" TEXT,
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Room_universityId_code_key" ON "Room"("universityId", "code");
CREATE INDEX IF NOT EXISTS "Room_universityId_isActive_idx" ON "Room"("universityId", "isActive");

-- ClassGroup
CREATE TABLE IF NOT EXISTS "ClassGroup" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassGroup_courseId_code_key" ON "ClassGroup"("courseId", "code");

-- ClassSchedule optional room / class group (keeps venue string for backward compatibility)
ALTER TABLE "ClassSchedule" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
ALTER TABLE "ClassSchedule" ADD COLUMN IF NOT EXISTS "classGroupId" TEXT;
CREATE INDEX IF NOT EXISTS "ClassSchedule_roomId_idx" ON "ClassSchedule"("roomId");
CREATE INDEX IF NOT EXISTS "ClassSchedule_classGroupId_idx" ON "ClassSchedule"("classGroupId");

-- LectureSession (dated occurrence of a weekly ClassSchedule)
CREATE TABLE IF NOT EXISTS "LectureSession" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "lectureDate" TIMESTAMP(3) NOT NULL,
  "status" "LectureSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "reason" "SessionDisruptionReason",
  "reasonNote" TEXT,
  "attributedToFacilities" BOOLEAN NOT NULL DEFAULT false,
  "roomId" TEXT,
  "substituteLecturerId" TEXT,
  "makeupOfSessionId" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LectureSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LectureSession_scheduleId_lectureDate_key" ON "LectureSession"("scheduleId", "lectureDate");
CREATE INDEX IF NOT EXISTS "LectureSession_courseId_lectureDate_idx" ON "LectureSession"("courseId", "lectureDate");
CREATE INDEX IF NOT EXISTS "LectureSession_status_lectureDate_idx" ON "LectureSession"("status", "lectureDate");
CREATE INDEX IF NOT EXISTS "LectureSession_attributedToFacilities_lectureDate_idx" ON "LectureSession"("attributedToFacilities", "lectureDate");
CREATE INDEX IF NOT EXISTS "LectureSession_roomId_lectureDate_idx" ON "LectureSession"("roomId", "lectureDate");

-- Combined/shared class groups on a session
CREATE TABLE IF NOT EXISTS "LectureSessionGroup" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  CONSTRAINT "LectureSessionGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LectureSessionGroup_sessionId_classGroupId_key" ON "LectureSessionGroup"("sessionId", "classGroupId");
CREATE INDEX IF NOT EXISTS "LectureSessionGroup_classGroupId_idx" ON "LectureSessionGroup"("classGroupId");

-- Academic calendar blackouts
CREATE TABLE IF NOT EXISTS "AcademicBlackout" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "departmentId" TEXT,
  "type" "BlackoutType" NOT NULL,
  "title" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "suppressesFlags" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicBlackout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AcademicBlackout_universityId_startDate_endDate_idx" ON "AcademicBlackout"("universityId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "AcademicBlackout_departmentId_startDate_endDate_idx" ON "AcademicBlackout"("departmentId", "startDate", "endDate");

-- Facilities issues / room-not-ready
CREATE TABLE IF NOT EXISTS "FacilitiesIssue" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "sessionId" TEXT,
  "reportedById" TEXT NOT NULL,
  "category" "SessionDisruptionReason" NOT NULL,
  "description" TEXT NOT NULL,
  "status" "FacilitiesIssueStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "FacilitiesIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FacilitiesIssue_universityId_status_createdAt_idx" ON "FacilitiesIssue"("universityId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "FacilitiesIssue_roomId_status_idx" ON "FacilitiesIssue"("roomId", "status");

-- Optional link from reports to dated sessions
ALTER TABLE "LectureReport" ADD COLUMN IF NOT EXISTS "lectureSessionId" TEXT;

-- Foreign keys (idempotent-ish via DO blocks)
DO $$ BEGIN
  ALTER TABLE "Room" ADD CONSTRAINT "Room_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_substituteLecturerId_fkey" FOREIGN KEY ("substituteLecturerId") REFERENCES "Lecturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_makeupOfSessionId_fkey" FOREIGN KEY ("makeupOfSessionId") REFERENCES "LectureSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSession" ADD CONSTRAINT "LectureSession_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSessionGroup" ADD CONSTRAINT "LectureSessionGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LectureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureSessionGroup" ADD CONSTRAINT "LectureSessionGroup_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AcademicBlackout" ADD CONSTRAINT "AcademicBlackout_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AcademicBlackout" ADD CONSTRAINT "AcademicBlackout_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FacilitiesIssue" ADD CONSTRAINT "FacilitiesIssue_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FacilitiesIssue" ADD CONSTRAINT "FacilitiesIssue_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FacilitiesIssue" ADD CONSTRAINT "FacilitiesIssue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LectureSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FacilitiesIssue" ADD CONSTRAINT "FacilitiesIssue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LectureReport" ADD CONSTRAINT "LectureReport_lectureSessionId_fkey" FOREIGN KEY ("lectureSessionId") REFERENCES "LectureSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Defense-in-depth RLS (Prisma bypasses; PostgREST denied)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Room','ClassGroup','LectureSession','LectureSessionGroup','AcademicBlackout','FacilitiesIssue'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS showup_deny_anon ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS showup_deny_authenticated ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY showup_deny_anon ON %I FOR ALL TO anon USING (false) WITH CHECK (false)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY showup_deny_authenticated ON %I FOR ALL TO authenticated USING (false) WITH CHECK (false)',
      tbl
    );
  END LOOP;
END $$;
