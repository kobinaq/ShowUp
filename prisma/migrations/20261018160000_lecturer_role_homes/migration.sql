-- Stage 3: Lecturer login + role homes (additive only)

ALTER TYPE "FlagEventType" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "FlagEventType" ADD VALUE IF NOT EXISTS 'RESPONDED';

ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "attendanceEditWindowHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "setupWizardCompletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AttendanceRecordEdit" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "fromStatus" "StudentAttendanceMark",
  "toStatus" "StudentAttendanceMark" NOT NULL,
  "editedById" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceRecordEdit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AttendanceRecordEdit_recordId_createdAt_idx" ON "AttendanceRecordEdit"("recordId", "createdAt");
CREATE INDEX IF NOT EXISTS "AttendanceRecordEdit_editedById_createdAt_idx" ON "AttendanceRecordEdit"("editedById", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AttendanceRecordEdit" ADD CONSTRAINT "AttendanceRecordEdit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceRecordEdit" ADD CONSTRAINT "AttendanceRecordEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "AttendanceRecordEdit" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "AttendanceRecordEdit" FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS showup_deny_anon ON "AttendanceRecordEdit";
  DROP POLICY IF EXISTS showup_deny_authenticated ON "AttendanceRecordEdit";
  CREATE POLICY showup_deny_anon ON "AttendanceRecordEdit" FOR ALL TO anon USING (false) WITH CHECK (false);
  CREATE POLICY showup_deny_authenticated ON "AttendanceRecordEdit" FOR ALL TO authenticated USING (false) WITH CHECK (false);
END $$;
