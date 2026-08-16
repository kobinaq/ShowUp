-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- LatePing
UPDATE "LatePing" SET "lecturerSmsStatus" = upper("lecturerSmsStatus");
UPDATE "LatePing" SET "lecturerEmailStatus" = upper("lecturerEmailStatus");
ALTER TABLE "LatePing" ALTER COLUMN "lecturerSmsStatus" TYPE "DeliveryStatus" USING "lecturerSmsStatus"::"DeliveryStatus";
ALTER TABLE "LatePing" ALTER COLUMN "lecturerEmailStatus" TYPE "DeliveryStatus" USING "lecturerEmailStatus"::"DeliveryStatus";

-- LecturerNotification
UPDATE "LecturerNotification" SET "status" = upper("status");
ALTER TABLE "LecturerNotification" ALTER COLUMN "status" TYPE "DeliveryStatus" USING "status"::"DeliveryStatus";

-- SupportTicket
ALTER TABLE "SupportTicket" ALTER COLUMN "emailStatus" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "smsStatus" DROP DEFAULT;
UPDATE "SupportTicket" SET "emailStatus" = upper("emailStatus");
UPDATE "SupportTicket" SET "smsStatus" = upper("smsStatus");
ALTER TABLE "SupportTicket" ALTER COLUMN "emailStatus" TYPE "DeliveryStatus" USING "emailStatus"::"DeliveryStatus";
ALTER TABLE "SupportTicket" ALTER COLUMN "smsStatus" TYPE "DeliveryStatus" USING "smsStatus"::"DeliveryStatus";
ALTER TABLE "SupportTicket" ALTER COLUMN "emailStatus" SET DEFAULT 'SKIPPED';
ALTER TABLE "SupportTicket" ALTER COLUMN "smsStatus" SET DEFAULT 'SKIPPED';
