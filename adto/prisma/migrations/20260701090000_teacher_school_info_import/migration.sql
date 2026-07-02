ALTER TABLE "Teacher" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "sourceSheet" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "sourceWorkbookFile" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "sourceRowRange" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "importedAt" TIMESTAMP(3);

ALTER TABLE "TeacherAssignment" ADD COLUMN "sourceKey" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "sourceSheet" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "sourceWorkbookFile" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "sourceRowRange" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "sourceDeployedFormId" TEXT;
ALTER TABLE "TeacherAssignment" ADD COLUMN "importedAt" TIMESTAMP(3);

ALTER TABLE "WorkbookImportBatch" ADD COLUMN "sheetSummary" TEXT;

CREATE UNIQUE INDEX "Teacher_sourceKey_key" ON "Teacher"("sourceKey");
CREATE INDEX "Teacher_sourceWorkbookFile_idx" ON "Teacher"("sourceWorkbookFile");

CREATE UNIQUE INDEX "TeacherAssignment_sourceKey_key" ON "TeacherAssignment"("sourceKey");
CREATE INDEX "TeacherAssignment_schoolId_sourceWorkbookFile_idx" ON "TeacherAssignment"("schoolId", "sourceWorkbookFile");
