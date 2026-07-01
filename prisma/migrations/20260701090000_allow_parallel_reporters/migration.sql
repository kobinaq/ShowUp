DROP INDEX IF EXISTS "LectureReport_scheduleId_lectureDate_key";

CREATE UNIQUE INDEX "LectureReport_scheduleId_lectureDate_submittedById_key"
ON "LectureReport"("scheduleId", "lectureDate", "submittedById");
