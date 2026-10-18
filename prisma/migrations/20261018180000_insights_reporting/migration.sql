-- Stage 4: Insights + reporting (additive only)

CREATE TYPE "ReportScopeType" AS ENUM ('UNIVERSITY', 'FACULTY', 'DEPARTMENT');
CREATE TYPE "ReportExportFormat" AS ENUM ('PDF', 'CSV', 'XLSX');

ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "monthlyReportEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UniversitySettings" ADD COLUMN IF NOT EXISTS "monthlyReportDayOfMonth" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "ScheduledReportJob" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "scopeType" "ReportScopeType" NOT NULL DEFAULT 'UNIVERSITY',
  "scopeId" TEXT,
  "cadence" TEXT NOT NULL DEFAULT 'MONTHLY',
  "format" "ReportExportFormat" NOT NULL DEFAULT 'CSV',
  "recipientRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "recipientEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledReportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledReportJob_universityId_enabled_nextRunAt_idx"
  ON "ScheduledReportJob"("universityId", "enabled", "nextRunAt");

DO $$ BEGIN
  ALTER TABLE "ScheduledReportJob" ADD CONSTRAINT "ScheduledReportJob_universityId_fkey"
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE "ScheduledReportJob" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "ScheduledReportJob" FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS showup_deny_anon ON "ScheduledReportJob";
  DROP POLICY IF EXISTS showup_deny_authenticated ON "ScheduledReportJob";
  CREATE POLICY showup_deny_anon ON "ScheduledReportJob" FOR ALL TO anon USING (false) WITH CHECK (false);
  CREATE POLICY showup_deny_authenticated ON "ScheduledReportJob" FOR ALL TO authenticated USING (false) WITH CHECK (false);
END $$;
