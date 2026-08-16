ALTER TABLE "RepAssignment" ADD COLUMN "sealedIdentityId" TEXT;

UPDATE "RepAssignment" AS assignment
SET "sealedIdentityId" = keeper.id
FROM "Profile" AS profile
JOIN "SealedRepIdentity" AS clone ON clone."anonymousAlias" = profile."anonymousAlias"
JOIN LATERAL (
  SELECT identity.id
  FROM "SealedRepIdentity" AS identity
  WHERE identity."courseId" = clone."courseId"
    AND lower(identity."realEmail") = lower(clone."realEmail")
  ORDER BY identity."createdAt" ASC, identity.id ASC
  LIMIT 1
) AS keeper ON true
WHERE assignment."profileId" = profile.id;

DELETE FROM "SealedRepIdentity"
WHERE id NOT IN (
  SELECT DISTINCT ON ("courseId", lower("realEmail")) id
  FROM "SealedRepIdentity"
  ORDER BY "courseId", lower("realEmail"), "createdAt" ASC, id ASC
);

DROP INDEX IF EXISTS "SealedRepIdentity_supabaseUid_key";
DROP INDEX IF EXISTS "SealedRepIdentity_anonymousAlias_key";
ALTER TABLE "SealedRepIdentity" DROP COLUMN "supabaseUid";
ALTER TABLE "SealedRepIdentity" DROP COLUMN "anonymousAlias";

CREATE UNIQUE INDEX "SealedRepIdentity_courseId_realEmail_key" ON "SealedRepIdentity"("courseId", "realEmail");

ALTER TABLE "SealedRepIdentity"
  ADD CONSTRAINT "SealedRepIdentity_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "RepAssignment" WHERE "sealedIdentityId" IS NULL) THEN
    RAISE EXCEPTION 'RepAssignment rows could not be mapped to a sealed identity';
  END IF;
END $$;

ALTER TABLE "RepAssignment" ALTER COLUMN "sealedIdentityId" SET NOT NULL;

ALTER TABLE "RepAssignment"
  ADD CONSTRAINT "RepAssignment_sealedIdentityId_fkey"
  FOREIGN KEY ("sealedIdentityId") REFERENCES "SealedRepIdentity"("id") ON UPDATE CASCADE;
