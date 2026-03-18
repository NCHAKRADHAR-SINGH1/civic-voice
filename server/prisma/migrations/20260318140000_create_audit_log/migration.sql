-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTHENTICATED', 'ROLE_UPDATED', 'LOCATION_UPDATED', 'ISSUE_CREATED', 'ISSUE_UPVOTED', 'COMMENT_ADDED', 'ISSUE_REPORTED', 'ISSUE_STATUS_UPDATED', 'ISSUE_RESOLVED', 'ADMIN_ACCESS_UPDATED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorRole_createdAt_idx" ON "AuditLog"("actorRole", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
