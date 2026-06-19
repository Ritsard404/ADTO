-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'FOR_VERIFICATION';

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'CHECKED', 'NEEDS_REVISION', 'COMPLETED');

-- AlterTable
ALTER TABLE "ACESession"
ADD COLUMN "sourceKey" TEXT,
ADD COLUMN "sourceSheet" TEXT,
ADD COLUMN "period" TEXT,
ADD COLUMN "subject" TEXT,
ADD COLUMN "teacher" TEXT,
ADD COLUMN "activity" TEXT,
ADD COLUMN "delivery" TEXT,
ADD COLUMN "completion" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "InventoryItem"
ADD COLUMN "unit" TEXT,
ADD COLUMN "sourceKey" TEXT,
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastCheckedBy" TEXT;

-- CreateTable
CREATE TABLE "ACEProject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "term" TEXT,
    "gradeLevel" TEXT,
    "section" TEXT,
    "students" TEXT,
    "teacher" TEXT,
    "projectType" TEXT,
    "description" TEXT,
    "projectUrl" TEXT,
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'SUBMITTED',
    "sourceKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ACEProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCheck" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "condition" "InventoryCondition" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remarks" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRemarkHistory" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "oldRemarks" TEXT,
    "newRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryRemarkHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ACESession_sourceKey_key" ON "ACESession"("sourceKey");
CREATE UNIQUE INDEX "InventoryItem_sourceKey_key" ON "InventoryItem"("sourceKey");
CREATE UNIQUE INDEX "ACEProject_sourceKey_key" ON "ACEProject"("sourceKey");
CREATE UNIQUE INDEX "ACEProject_schoolId_title_gradeLevel_section_key" ON "ACEProject"("schoolId", "title", "gradeLevel", "section");
CREATE INDEX "ACEProject_schoolId_idx" ON "ACEProject"("schoolId");
CREATE INDEX "ACEProject_sessionId_idx" ON "ACEProject"("sessionId");
CREATE INDEX "InventoryCheck_itemId_idx" ON "InventoryCheck"("itemId");
CREATE INDEX "InventoryRemarkHistory_itemId_idx" ON "InventoryRemarkHistory"("itemId");

-- AddForeignKey
ALTER TABLE "ACEProject" ADD CONSTRAINT "ACEProject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ACEProject" ADD CONSTRAINT "ACEProject_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ACESession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryCheck" ADD CONSTRAINT "InventoryCheck_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryRemarkHistory" ADD CONSTRAINT "InventoryRemarkHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
