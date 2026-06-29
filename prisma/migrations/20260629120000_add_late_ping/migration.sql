-- CreateTable
CREATE TABLE "UniversitySettings" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "latePingThresholdMinutes" INTEGER NOT NULL DEFAULT 30,
    "submissionWindowHours" INTEGER NOT NULL DEFAULT 2,
    "flagCoverageWeek6" INTEGER NOT NULL DEFAULT 60,
    "flagCoverageWeek10" INTEGER NOT NULL DEFAULT 80,
    "flagRepeatThreshold" INTEGER NOT NULL DEFAULT 3,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatePing" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "lectureDate" TIMESTAMP(3) NOT NULL,
    "minutesLate" INTEGER NOT NULL,
    "lecturerSmsStatus" TEXT NOT NULL,
    "lecturerEmailStatus" TEXT NOT NULL,
    "qaNotified" BOOLEAN NOT NULL DEFAULT true,
    "acknowledgeToken" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "hodNotified" BOOLEAN NOT NULL DEFAULT false,
    "hodNotifiedAt" TIMESTAMP(3),
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LatePing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UniversitySettings_universityId_key" ON "UniversitySettings"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "LatePing_acknowledgeToken_key" ON "LatePing"("acknowledgeToken");

-- CreateIndex
CREATE UNIQUE INDEX "LatePing_reportId_key" ON "LatePing"("reportId");

-- AddForeignKey
ALTER TABLE "UniversitySettings" ADD CONSTRAINT "UniversitySettings_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatePing" ADD CONSTRAINT "LatePing_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatePing" ADD CONSTRAINT "LatePing_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatePing" ADD CONSTRAINT "LatePing_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatePing" ADD CONSTRAINT "LatePing_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LectureReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
