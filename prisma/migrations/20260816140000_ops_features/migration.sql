ALTER TABLE "UniversitySettings" ADD COLUMN "contestSlaDays" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "UniversitySettings" ADD COLUMN "notificationMaxRetries" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "UniversitySettings" ADD COLUMN "lecturerDigestEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Lecturer" ADD COLUMN "digestEmailEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Contest" ADD COLUMN "escalatedAt" TIMESTAMP(3);

ALTER TABLE "LecturerNotification" ADD COLUMN "subject" TEXT;
ALTER TABLE "LecturerNotification" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "LecturerNotification" ADD COLUMN "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "LecturerNotification" ADD COLUMN "nextRetryAt" TIMESTAMP(3);

CREATE INDEX "LecturerNotification_status_nextRetryAt_idx" ON "LecturerNotification"("status", "nextRetryAt");

ALTER TABLE "RotationLog" ADD COLUMN "error" TEXT;

CREATE TYPE "RosterProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "RosterProposal" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "realEmail" TEXT NOT NULL,
    "realPhone" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "status" "RosterProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RosterProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RosterProposal_courseId_status_idx" ON "RosterProposal"("courseId", "status");
CREATE INDEX "RosterProposal_status_createdAt_idx" ON "RosterProposal"("status", "createdAt");

ALTER TABLE "RosterProposal" ADD CONSTRAINT "RosterProposal_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterProposal" ADD CONSTRAINT "RosterProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Profile"("id") ON UPDATE CASCADE;
ALTER TABLE "RosterProposal" ADD CONSTRAINT "RosterProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Profile"("id") ON UPDATE CASCADE;

CREATE TYPE "FlagEventType" AS ENUM ('CREATED', 'RESOLVED', 'REOPENED');

CREATE TABLE "FlagEvent" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "type" "FlagEventType" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FlagEvent_flagId_createdAt_idx" ON "FlagEvent"("flagId", "createdAt");

ALTER TABLE "FlagEvent" ADD CONSTRAINT "FlagEvent_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "Flag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlagEvent" ADD CONSTRAINT "FlagEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "ReportDiscrepancyStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "ReportDiscrepancy" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "lectureDate" TIMESTAMP(3) NOT NULL,
    "firstReportId" TEXT NOT NULL,
    "secondReportId" TEXT NOT NULL,
    "status" "ReportDiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDiscrepancy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportDiscrepancy_scheduleId_lectureDate_key" ON "ReportDiscrepancy"("scheduleId", "lectureDate");
CREATE INDEX "ReportDiscrepancy_status_createdAt_idx" ON "ReportDiscrepancy"("status", "createdAt");

ALTER TABLE "ReportDiscrepancy" ADD CONSTRAINT "ReportDiscrepancy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportDiscrepancy" ADD CONSTRAINT "ReportDiscrepancy_firstReportId_fkey" FOREIGN KEY ("firstReportId") REFERENCES "LectureReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportDiscrepancy" ADD CONSTRAINT "ReportDiscrepancy_secondReportId_fkey" FOREIGN KEY ("secondReportId") REFERENCES "LectureReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['RosterProposal', 'FlagEvent', 'ReportDiscrepancy']
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
