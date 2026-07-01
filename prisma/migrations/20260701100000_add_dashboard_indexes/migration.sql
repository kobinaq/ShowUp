CREATE INDEX IF NOT EXISTS "RepAssignment_courseId_isActive_idx"
ON "RepAssignment"("courseId", "isActive");

CREATE INDEX IF NOT EXISTS "LectureReport_courseId_lectureDate_idx"
ON "LectureReport"("courseId", "lectureDate");

CREATE INDEX IF NOT EXISTS "LectureReport_lectureDate_lecturerPresent_idx"
ON "LectureReport"("lectureDate", "lecturerPresent");

CREATE INDEX IF NOT EXISTS "LectureReport_lectureDate_arrivalStatus_idx"
ON "LectureReport"("lectureDate", "arrivalStatus");

CREATE INDEX IF NOT EXISTS "LectureReport_submittedById_lectureDate_idx"
ON "LectureReport"("submittedById", "lectureDate");

CREATE INDEX IF NOT EXISTS "LatePing_courseId_lectureDate_idx"
ON "LatePing"("courseId", "lectureDate");

CREATE INDEX IF NOT EXISTS "LatePing_lectureDate_acknowledgedAt_idx"
ON "LatePing"("lectureDate", "acknowledgedAt");

CREATE INDEX IF NOT EXISTS "Contest_status_raisedAt_idx"
ON "Contest"("status", "raisedAt");

CREATE INDEX IF NOT EXISTS "Flag_isResolved_createdAt_idx"
ON "Flag"("isResolved", "createdAt");

CREATE INDEX IF NOT EXISTS "Flag_lecturerId_createdAt_idx"
ON "Flag"("lecturerId", "createdAt");
