CREATE TABLE "WorkbookImportBatch" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "importedById" TEXT NOT NULL,
  "facilitatorEmail" TEXT NOT NULL,
  "selectedSheets" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rowsRead" INTEGER NOT NULL DEFAULT 0,
  "rowsImported" INTEGER NOT NULL DEFAULT 0,
  "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
  "validationErrors" TEXT,
  "schoolId" TEXT,
  "schoolName" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  CONSTRAINT "WorkbookImportBatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkbookImportBatch" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "WorkbookImportBatch_checksum_idx" ON "WorkbookImportBatch"("checksum");
CREATE INDEX "WorkbookImportBatch_importedById_idx" ON "WorkbookImportBatch"("importedById");
CREATE INDEX "WorkbookImportBatch_schoolId_idx" ON "WorkbookImportBatch"("schoolId");
CREATE INDEX "WorkbookImportBatch_createdAt_idx" ON "WorkbookImportBatch"("createdAt");

CREATE INDEX "ACESession_schoolId_scheduledDate_idx" ON "ACESession"("schoolId", "scheduledDate");
CREATE INDEX "ACESession_facilitatorId_scheduledDate_idx" ON "ACESession"("facilitatorId", "scheduledDate");
CREATE INDEX "ACESession_schoolId_status_idx" ON "ACESession"("schoolId", "status");
CREATE INDEX "ACEProject_schoolId_updatedAt_idx" ON "ACEProject"("schoolId", "updatedAt");
CREATE INDEX "InventoryItem_schoolId_condition_idx" ON "InventoryItem"("schoolId", "condition");
CREATE INDEX "MediaUpload_schoolId_createdAt_idx" ON "MediaUpload"("schoolId", "createdAt");
CREATE INDEX "ReportHistory_schoolId_generatedAt_idx" ON "ReportHistory"("schoolId", "generatedAt");
