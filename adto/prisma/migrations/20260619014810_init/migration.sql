-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FACILITATOR', 'SCHOOL_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'PAUSED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('NOT_STARTED', 'ONGOING', 'COMPLETED', 'MISSED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'NEEDS_REPLACEMENT', 'LOST');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'RETURNED');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FACILITATOR',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT,
    "schoolYear" TEXT NOT NULL,
    "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitatorAssignment" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "FacilitatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ACESession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "remarks" TEXT,

    CONSTRAINT "ACESession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionProgress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "skillCovered" TEXT NOT NULL,
    "activityCompleted" BOOLEAN NOT NULL DEFAULT false,
    "studentAttendance" INTEGER NOT NULL,
    "completionPercentage" INTEGER NOT NULL,
    "issuesEncountered" TEXT,
    "nextSteps" TEXT,

    CONSTRAINT "SessionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'GOOD',
    "remarks" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUpload" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_facilitatorId_idx" ON "FacilitatorAssignment"("facilitatorId");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_schoolId_idx" ON "FacilitatorAssignment"("schoolId");

-- CreateIndex
CREATE INDEX "ACESession_schoolId_idx" ON "ACESession"("schoolId");

-- CreateIndex
CREATE INDEX "ACESession_facilitatorId_idx" ON "ACESession"("facilitatorId");

-- CreateIndex
CREATE INDEX "ACESession_scheduledDate_idx" ON "ACESession"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "SessionProgress_sessionId_key" ON "SessionProgress"("sessionId");

-- CreateIndex
CREATE INDEX "InventoryItem_schoolId_idx" ON "InventoryItem"("schoolId");

-- CreateIndex
CREATE INDEX "Report_schoolId_idx" ON "Report"("schoolId");

-- CreateIndex
CREATE INDEX "Report_facilitatorId_idx" ON "Report"("facilitatorId");

-- CreateIndex
CREATE INDEX "Report_sessionId_idx" ON "Report"("sessionId");

-- CreateIndex
CREATE INDEX "MediaUpload_schoolId_idx" ON "MediaUpload"("schoolId");

-- CreateIndex
CREATE INDEX "MediaUpload_sessionId_idx" ON "MediaUpload"("sessionId");

-- CreateIndex
CREATE INDEX "MediaUpload_uploadedById_idx" ON "MediaUpload"("uploadedById");

-- AddForeignKey
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACESession" ADD CONSTRAINT "ACESession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACESession" ADD CONSTRAINT "ACESession_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionProgress" ADD CONSTRAINT "SessionProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ACESession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ACESession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUpload" ADD CONSTRAINT "MediaUpload_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUpload" ADD CONSTRAINT "MediaUpload_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ACESession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUpload" ADD CONSTRAINT "MediaUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
