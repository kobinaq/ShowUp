-- Durable lead rate limiting + client IP capture
ALTER TABLE "LeadInquiry" ADD COLUMN IF NOT EXISTS "clientIp" TEXT;
CREATE INDEX IF NOT EXISTS "LeadInquiry_clientIp_createdAt_idx" ON "LeadInquiry"("clientIp", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadInquiry_email_createdAt_idx" ON "LeadInquiry"("email", "createdAt");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- Defense-in-depth RLS for Supabase PostgREST (anon/authenticated).
-- Prisma typically connects as a privileged role and bypasses RLS; these policies
-- protect direct table access via the Supabase API keys.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'University','UniversitySettings','Faculty','Department','Semester','Profile',
    'SealedRepIdentity','Lecturer','Course','CourseOutline','OutlineTopic','ClassSchedule',
    'RepAssignment','LectureReport','LatePing','TeachingAid','ReportTopic','Contest','Flag',
    'LecturerNotification','IdentityLookup','RotationLog','ActivityLog','LeadInquiry',
    'SupportTicket','RateLimitBucket'
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

-- Authenticated users may read only their own Profile row (needed if client ever queries it).
DROP POLICY IF EXISTS showup_profile_self_select ON "Profile";
CREATE POLICY showup_profile_self_select ON "Profile"
  FOR SELECT TO authenticated
  USING ("supabaseUid" = auth.uid()::text);
