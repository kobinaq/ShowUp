ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'IT';

ALTER TABLE "Profile" ADD COLUMN "phone" TEXT;

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketCategory" AS ENUM ('LOGIN_ACCESS', 'COURSE_SETUP', 'REPORTING_ISSUE', 'NOTIFICATION_ISSUE', 'DATA_CORRECTION', 'OTHER');
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL,
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "emailStatus" TEXT NOT NULL DEFAULT 'skipped',
    "smsStatus" TEXT NOT NULL DEFAULT 'skipped',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SupportTicket_universityId_status_idx" ON "SupportTicket"("universityId", "status");
CREATE INDEX "SupportTicket_requesterId_idx" ON "SupportTicket"("requesterId");
