-- Stage 2: Rep reliability (additive only — no destructive data changes)

CREATE TYPE "RepDutyRole" AS ENUM ('PRIMARY', 'BACKUP');
CREATE TYPE "SubmissionSource" AS ENUM ('WEB', 'OFFLINE_DRAFT', 'SMS');
CREATE TYPE "SessionReportCoverage" AS ENUM ('PENDING', 'REPORTED', 'LATE_REPORTED', 'NO_DATA');
CREATE TYPE "DiscrepancyKind" AS ENUM ('PEER_REPORT', 'LECTURER_CONFIRMATION');
CREATE TYPE "RepNotificationKind" AS ENUM ('BACKUP_ESCALATION', 'PRIMARY_REMINDER', 'MISSING_REPORT_NUDGE', 'SMS_REPORT_HINT');
CREATE TYPE "RepReliabilityFlagType" AS ENUM ('REPEATED_MISS_REPORT');

-- UniversitySettings: backup escalation + late submission window
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "backupEscalateMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "lateSubmissionHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "missedReportFlagThreshold" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "backupNotifySmsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "repReminderSmsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- RepAssignment: primary/backup + reliability counters
ALTER TABLE "RepAssignment" ADD COLUMN IF NOT EXISTS "dutyRole" "RepDutyRole" NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE "RepAssignment" ADD COLUMN IF NOT EXISTS "missedReportCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RepAssignment" ADD COLUMN IF NOT EXISTS "lastMissedAt" TIMESTAMP(3);
ALTER TABLE "RepAssignment" ADD COLUMN IF NOT EXISTS "reliabilityFlaggedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RepAssignment_courseId_dutyRole_isActive_idx" ON "RepAssignment"("courseId", "dutyRole", "isActive");

-- LectureReport: late tag + source
ALTER TABLE "LectureReport" ADD COLUMN IF NOT EXISTS "isLateSubmission" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LectureReport" ADD COLUMN IF NOT EXISTS "submissionSource" "SubmissionSource" NOT NULL DEFAULT 'WEB';
CREATE INDEX IF NOT EXISTS "LectureReport_isLateSubmission_lectureDate_idx" ON "LectureReport"("isLateSubmission", "lectureDate");

-- LectureSession: report coverage tracking (NO_DATA ≠ lecture missed)
ALTER TABLE "LectureSession" ADD COLUMN IF NOT EXISTS "reportCoverage" "SessionReportCoverage" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LectureSession" ADD COLUMN IF NOT EXISTS "primaryNotifiedAt" TIMESTAMP(3);
ALTER TABLE "LectureSession" ADD COLUMN IF NOT EXISTS "backupNotifiedAt" TIMESTAMP(3);
ALTER TABLE "LectureSession" ADD COLUMN IF NOT EXISTS "noDataMarkedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "LectureSession_reportCoverage_lectureDate_idx" ON "LectureSession"("reportCoverage", "lectureDate");

-- SessionConfirmation (lecturer/HOD second source)
CREATE TABLE IF NOT EXISTS "SessionConfirmation" (
  "id" TEXT NOT NULL,
  "lectureSessionId" TEXT NOT NULL,
  "confirmedById" TEXT NOT NULL,
  "presence" "PresenceStatus" NOT NULL,
  "note" TEXT,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionConfirmation_lectureSessionId_key" ON "SessionConfirmation"("lectureSessionId");
CREATE INDEX IF NOT EXISTS "SessionConfirmation_confirmedById_confirmedAt_idx" ON "SessionConfirmation"("confirmedById", "confirmedAt");

-- ReportDiscrepancy: lecturer confirmation path + resolve fields
ALTER TABLE "ReportDiscrepancy" ADD COLUMN IF NOT EXISTS "kind" "DiscrepancyKind" NOT NULL DEFAULT 'PEER_REPORT';
ALTER TABLE "ReportDiscrepancy" ADD COLUMN IF NOT EXISTS "confirmationId" TEXT;
ALTER TABLE "ReportDiscrepancy" ADD COLUMN IF NOT EXISTS "resolvedById" TEXT;
ALTER TABLE "ReportDiscrepancy" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
ALTER TABLE "ReportDiscrepancy" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "ReportDiscrepancy" ALTER COLUMN "secondReportId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ReportDiscrepancy_confirmationId_key" ON "ReportDiscrepancy"("confirmationId");
CREATE INDEX IF NOT EXISTS "ReportDiscrepancy_kind_status_idx" ON "ReportDiscrepancy"("kind", "status");

-- Rep SMS notifications (retryable, separate from lecturer notices)
CREATE TABLE IF NOT EXISTS "RepNotification" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "courseId" TEXT,
  "sessionId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "kind" "RepNotificationKind" NOT NULL,
  "message" TEXT NOT NULL,
  "subject" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "DeliveryStatus" NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextRetryAt" TIMESTAMP(3),
  CONSTRAINT "RepNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RepNotification_status_nextRetryAt_idx" ON "RepNotification"("status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "RepNotification_profileId_sentAt_idx" ON "RepNotification"("profileId", "sentAt");
CREATE INDEX IF NOT EXISTS "RepNotification_sessionId_kind_idx" ON "RepNotification"("sessionId", "kind");

-- Rep reliability flags (missing reports are NOT lecturer absence)
CREATE TABLE IF NOT EXISTS "RepReliabilityFlag" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "courseId" TEXT,
  "type" "RepReliabilityFlagType" NOT NULL,
  "message" TEXT NOT NULL,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RepReliabilityFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RepReliabilityFlag_profileId_isResolved_createdAt_idx" ON "RepReliabilityFlag"("profileId", "isResolved", "createdAt");
CREATE INDEX IF NOT EXISTS "RepReliabilityFlag_isResolved_createdAt_idx" ON "RepReliabilityFlag"("isResolved", "createdAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "SessionConfirmation" ADD CONSTRAINT "SessionConfirmation_lectureSessionId_fkey" FOREIGN KEY ("lectureSessionId") REFERENCES "LectureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SessionConfirmation" ADD CONSTRAINT "SessionConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReportDiscrepancy" ADD CONSTRAINT "ReportDiscrepancy_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "SessionConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReportDiscrepancy" ADD CONSTRAINT "ReportDiscrepancy_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RepNotification" ADD CONSTRAINT "RepNotification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RepReliabilityFlag" ADD CONSTRAINT "RepReliabilityFlag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Defense-in-depth RLS (Prisma bypasses; PostgREST denied)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'SessionConfirmation','RepNotification','RepReliabilityFlag'
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
