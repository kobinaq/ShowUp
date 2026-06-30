ALTER TABLE "UniversitySettings"
  ADD COLUMN "lecturerAbsenceSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lecturerAbsenceEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "latePingSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "latePingEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "qaLatePingEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showUpAiEnabled" BOOLEAN NOT NULL DEFAULT true;
