-- Stage 5: Polish + scale (additive indexes, daily summary; no destructive data changes)

ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "dailySummaryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Precomputed daily summaries for dashboards
CREATE TABLE IF NOT EXISTS "DailyQualitySummary" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "facultyId" TEXT,
  "departmentId" TEXT,
  "summaryDate" TIMESTAMP(3) NOT NULL,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "presentCount" INTEGER NOT NULL DEFAULT 0,
  "absentCount" INTEGER NOT NULL DEFAULT 0,
  "lateCount" INTEGER NOT NULL DEFAULT 0,
  "unresolvedFlags" INTEGER NOT NULL DEFAULT 0,
  "openContests" INTEGER NOT NULL DEFAULT 0,
  "pingCount" INTEGER NOT NULL DEFAULT 0,
  "pingAckCount" INTEGER NOT NULL DEFAULT 0,
  "noDataSessions" INTEGER NOT NULL DEFAULT 0,
  "courseCount" INTEGER NOT NULL DEFAULT 0,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyQualitySummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyQualitySummary_universityId_facultyId_departmentId_summaryDate_key"
  ON "DailyQualitySummary"("universityId", "facultyId", "departmentId", "summaryDate");
CREATE INDEX IF NOT EXISTS "DailyQualitySummary_universityId_summaryDate_idx" ON "DailyQualitySummary"("universityId", "summaryDate");
CREATE INDEX IF NOT EXISTS "DailyQualitySummary_departmentId_summaryDate_idx" ON "DailyQualitySummary"("departmentId", "summaryDate");
CREATE INDEX IF NOT EXISTS "DailyQualitySummary_facultyId_summaryDate_idx" ON "DailyQualitySummary"("facultyId", "summaryDate");

DO $$ BEGIN
  ALTER TABLE "DailyQualitySummary" ADD CONSTRAINT "DailyQualitySummary_universityId_fkey"
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 27 high-value missing FK indexes
CREATE INDEX IF NOT EXISTS "Faculty_universityId_idx" ON "Faculty"("universityId");
CREATE INDEX IF NOT EXISTS "Department_facultyId_idx" ON "Department"("facultyId");
CREATE INDEX IF NOT EXISTS "Semester_universityId_idx" ON "Semester"("universityId");
CREATE INDEX IF NOT EXISTS "Profile_universityId_idx" ON "Profile"("universityId");
CREATE INDEX IF NOT EXISTS "Profile_departmentId_idx" ON "Profile"("departmentId");
CREATE INDEX IF NOT EXISTS "Lecturer_departmentId_idx" ON "Lecturer"("departmentId");
CREATE INDEX IF NOT EXISTS "Course_departmentId_idx" ON "Course"("departmentId");
CREATE INDEX IF NOT EXISTS "Course_lecturerId_idx" ON "Course"("lecturerId");
CREATE INDEX IF NOT EXISTS "OutlineTopic_outlineId_idx" ON "OutlineTopic"("outlineId");
CREATE INDEX IF NOT EXISTS "ClassSchedule_courseId_idx" ON "ClassSchedule"("courseId");
CREATE INDEX IF NOT EXISTS "RepAssignment_profileId_idx" ON "RepAssignment"("profileId");
CREATE INDEX IF NOT EXISTS "RepAssignment_sealedIdentityId_idx" ON "RepAssignment"("sealedIdentityId");
CREATE INDEX IF NOT EXISTS "LectureReport_lectureSessionId_idx" ON "LectureReport"("lectureSessionId");
CREATE INDEX IF NOT EXISTS "LatePing_scheduleId_idx" ON "LatePing"("scheduleId");
CREATE INDEX IF NOT EXISTS "TeachingAid_reportId_idx" ON "TeachingAid"("reportId");
CREATE INDEX IF NOT EXISTS "Contest_raisedById_idx" ON "Contest"("raisedById");
CREATE INDEX IF NOT EXISTS "Flag_reportId_idx" ON "Flag"("reportId");
CREATE INDEX IF NOT EXISTS "LecturerNotification_lecturerId_idx" ON "LecturerNotification"("lecturerId");
CREATE INDEX IF NOT EXISTS "ActivityLog_universityId_idx" ON "ActivityLog"("universityId");
CREATE INDEX IF NOT EXISTS "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");
CREATE INDEX IF NOT EXISTS "AttendanceSession_scheduleId_idx" ON "AttendanceSession"("scheduleId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_markedById_idx" ON "AttendanceRecord"("markedById");
CREATE INDEX IF NOT EXISTS "SupportTicket_universityId_idx" ON "SupportTicket"("universityId");
CREATE INDEX IF NOT EXISTS "RepNotification_courseId_idx" ON "RepNotification"("courseId");
CREATE INDEX IF NOT EXISTS "RepReliabilityFlag_courseId_idx" ON "RepReliabilityFlag"("courseId");
CREATE INDEX IF NOT EXISTS "FacilitiesIssue_sessionId_idx" ON "FacilitiesIssue"("sessionId");
CREATE INDEX IF NOT EXISTS "ReportDiscrepancy_courseId_idx" ON "ReportDiscrepancy"("courseId");

DO $$
BEGIN
  ALTER TABLE "DailyQualitySummary" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "DailyQualitySummary" FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS showup_deny_anon ON "DailyQualitySummary";
  DROP POLICY IF EXISTS showup_deny_authenticated ON "DailyQualitySummary";
  CREATE POLICY showup_deny_anon ON "DailyQualitySummary" FOR ALL TO anon USING (false) WITH CHECK (false);
  CREATE POLICY showup_deny_authenticated ON "DailyQualitySummary" FOR ALL TO authenticated USING (false) WITH CHECK (false);
END $$;
