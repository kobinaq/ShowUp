-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LECTURER';

-- AlterTable
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "studentAttendanceThreshold" INTEGER NOT NULL DEFAULT 75;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "lecturerId" TEXT;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AttendanceSessionStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentAttendanceMark" AS ENUM ('PRESENT', 'ABSENT', 'LATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentAttendanceFlagStatus" AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "lectureDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "StudentAttendanceMark" NOT NULL,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentAttendanceFlag" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "attendancePercent" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "status" "StudentAttendanceFlagStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "StudentAttendanceFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_lecturerId_key" ON "Profile"("lecturerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_universityId_studentNumber_key" ON "Student"("universityId", "studentNumber");
CREATE INDEX IF NOT EXISTS "Student_universityId_fullName_idx" ON "Student"("universityId", "fullName");
CREATE UNIQUE INDEX IF NOT EXISTS "CourseEnrollment_courseId_studentId_key" ON "CourseEnrollment"("courseId", "studentId");
CREATE INDEX IF NOT EXISTS "CourseEnrollment_studentId_idx" ON "CourseEnrollment"("studentId");
CREATE INDEX IF NOT EXISTS "AttendanceSession_courseId_lectureDate_idx" ON "AttendanceSession"("courseId", "lectureDate");
CREATE INDEX IF NOT EXISTS "AttendanceSession_status_createdAt_idx" ON "AttendanceSession"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_studentId_status_idx" ON "AttendanceRecord"("studentId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAttendanceFlag_studentId_courseId_key" ON "StudentAttendanceFlag"("studentId", "courseId");
CREATE INDEX IF NOT EXISTS "StudentAttendanceFlag_courseId_status_idx" ON "StudentAttendanceFlag"("courseId", "status");

DO $$ BEGIN
  ALTER TABLE "Profile" ADD CONSTRAINT "Profile_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Student" ADD CONSTRAINT "Student_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "Profile"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "Profile"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StudentAttendanceFlag" ADD CONSTRAINT "StudentAttendanceFlag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StudentAttendanceFlag" ADD CONSTRAINT "StudentAttendanceFlag_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['Student', 'CourseEnrollment', 'AttendanceSession', 'AttendanceRecord', 'StudentAttendanceFlag']
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
