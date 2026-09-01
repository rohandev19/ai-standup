-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'TRIALING');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "StandupStatus" AS ENUM ('SUBMITTED', 'LATE', 'MISSED', 'PENDING_AI');

-- CreateEnum
CREATE TYPE "BlockerSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SUBMISSION_REMINDER', 'BLOCKER_ALERT', 'SUMMARY_READY', 'WEEKLY_DIGEST_READY', 'INVITE_ACCEPTED', 'MEMBER_REMOVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedUntil" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "consentGivenAt" TIMESTAMP(3),
    "globalEmailPref" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "standupWindowStart" TEXT NOT NULL DEFAULT '00:00',
    "standupWindowEnd" TEXT NOT NULL DEFAULT '11:00',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "joinCode" TEXT NOT NULL,
    "joinPassword" TEXT NOT NULL DEFAULT 'admin123',
    "lastProcessedDate" DATE,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" "SubscriptionStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "teamId" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "standupDate" DATE NOT NULL,
    "yesterdayText" VARCHAR(2000),
    "todayText" VARCHAR(2000),
    "blockerText" VARCHAR(2000),
    "status" "StandupStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockerFlag" (
    "id" TEXT NOT NULL,
    "standupEntryId" TEXT NOT NULL,
    "severity" "BlockerSeverity" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BlockerFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "summaryDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "blockerCount" INTEGER NOT NULL,
    "submissionRate" DOUBLE PRECISION NOT NULL,
    "missedMembers" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isManualTrigger" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyDigest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "totalEntries" INTEGER NOT NULL,
    "totalBlockers" INTEGER NOT NULL,
    "resolvedBlockers" INTEGER NOT NULL,
    "avgSubmissionRate" DOUBLE PRECISION NOT NULL,
    "topMissers" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_joinCode_key" ON "Workspace"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Team_workspaceId_idx" ON "Team"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_token_idx" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_workspaceId_email_usedAt_key" ON "WorkspaceInvite"("workspaceId", "email", "usedAt");

-- CreateIndex
CREATE INDEX "StandupEntry_workspaceId_standupDate_idx" ON "StandupEntry"("workspaceId", "standupDate");

-- CreateIndex
CREATE UNIQUE INDEX "StandupEntry_workspaceId_userId_standupDate_key" ON "StandupEntry"("workspaceId", "userId", "standupDate");

-- CreateIndex
CREATE UNIQUE INDEX "BlockerFlag_standupEntryId_key" ON "BlockerFlag"("standupEntryId");

-- CreateIndex
CREATE INDEX "BlockerFlag_standupEntryId_idx" ON "BlockerFlag"("standupEntryId");

-- CreateIndex
CREATE INDEX "AiSummary_workspaceId_summaryDate_idx" ON "AiSummary"("workspaceId", "summaryDate");

-- CreateIndex
CREATE UNIQUE INDEX "AiSummary_workspaceId_summaryDate_key" ON "AiSummary"("workspaceId", "summaryDate");

-- CreateIndex
CREATE INDEX "WeeklyDigest_workspaceId_weekStartDate_idx" ON "WeeklyDigest"("workspaceId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyDigest_workspaceId_weekStartDate_key" ON "WeeklyDigest"("workspaceId", "weekStartDate");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_action_idx" ON "AuditLog"("workspaceId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockerFlag" ADD CONSTRAINT "BlockerFlag_standupEntryId_fkey" FOREIGN KEY ("standupEntryId") REFERENCES "StandupEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyDigest" ADD CONSTRAINT "WeeklyDigest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
