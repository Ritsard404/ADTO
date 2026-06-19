-- CreateEnum
CREATE TYPE "SchoolYearStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryAssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'LOST', 'RETIRED');

-- AlterTable
ALTER TABLE "School"
ADD COLUMN "contactNumber" TEXT,
ADD COLUMN "schoolCode" TEXT,
ADD COLUMN "schoolType" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "division" TEXT,
ADD COLUMN "adoptionYear" TEXT,
ADD COLUMN "implementationYear" TEXT,
ADD COLUMN "adoptionType" TEXT,
ADD COLUMN "scheduleArrangement" TEXT,
ADD COLUMN "codingModality" TEXT,
ADD COLUMN "hardwareAllocation" TEXT,
ADD COLUMN "softwareAllocation" TEXT;

-- AlterTable
ALTER TABLE "ACESession"
ADD COLUMN "startTime" TEXT,
ADD COLUMN "durationHours" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "InventoryItem"
ADD COLUMN "assetNumber" TEXT,
ADD COLUMN "deviceType" TEXT,
ADD COLUMN "serialNumber" TEXT,
ADD COLUMN "assignedFacilitatorId" TEXT,
ADD COLUMN "deploymentDate" TIMESTAMP(3),
ADD COLUMN "assetStatus" "InventoryAssetStatus" NOT NULL DEFAULT 'ASSIGNED';

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "SchoolYearStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSection" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "adviserName" TEXT,
    "maleStudents" INTEGER NOT NULL DEFAULT 0,
    "femaleStudents" INTEGER NOT NULL DEFAULT 0,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchoolSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "department" TEXT,
    "email" TEXT,
    "contactNumber" TEXT,
    "position" TEXT,
    "employmentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT,
    "schoolYear" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sessionsParticipated" INTEGER NOT NULL DEFAULT 0,
    "hoursSupported" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "projectsFacilitated" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" INTEGER NOT NULL DEFAULT 0,
    "participationScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolRemark" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "remarkType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "actionItems" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMaintenanceLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue" TEXT NOT NULL,
    "resolution" TEXT,
    "cost" DECIMAL(65,30),
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "InventoryMaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportNarrative" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_schoolId_label_key" ON "SchoolYear"("schoolId", "label");
CREATE INDEX "SchoolYear_schoolId_idx" ON "SchoolYear"("schoolId");
CREATE UNIQUE INDEX "SchoolSection_schoolId_schoolYear_gradeLevel_sectionName_key" ON "SchoolSection"("schoolId", "schoolYear", "gradeLevel", "sectionName");
CREATE INDEX "SchoolSection_schoolId_idx" ON "SchoolSection"("schoolId");
CREATE INDEX "TeacherAssignment_schoolId_idx" ON "TeacherAssignment"("schoolId");
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");
CREATE UNIQUE INDEX "ActivityCategory_name_key" ON "ActivityCategory"("name");
CREATE INDEX "SchoolRemark_schoolId_idx" ON "SchoolRemark"("schoolId");
CREATE INDEX "InventoryMaintenanceLog_itemId_idx" ON "InventoryMaintenanceLog"("itemId");
CREATE UNIQUE INDEX "ReportNarrative_schoolId_schoolYear_reportType_sectionKey_key" ON "ReportNarrative"("schoolId", "schoolYear", "reportType", "sectionKey");
CREATE INDEX "ReportNarrative_schoolId_idx" ON "ReportNarrative"("schoolId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "ApprovalRequest"("requestedBy");

-- AddForeignKey
ALTER TABLE "SchoolYear" ADD CONSTRAINT "SchoolYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolSection" ADD CONSTRAINT "SchoolSection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SchoolSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SchoolRemark" ADD CONSTRAINT "SchoolRemark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMaintenanceLog" ADD CONSTRAINT "InventoryMaintenanceLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportNarrative" ADD CONSTRAINT "ReportNarrative_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
