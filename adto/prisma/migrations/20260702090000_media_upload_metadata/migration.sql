ALTER TABLE "MediaUpload" ADD COLUMN "storageBucket" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "MediaUpload" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "originalSource" TEXT NOT NULL DEFAULT 'EXTERNAL_LINK';
ALTER TABLE "MediaUpload" ADD COLUMN "uploadStatus" TEXT NOT NULL DEFAULT 'LINKED';
ALTER TABLE "MediaUpload" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "MediaUpload" ADD COLUMN "teacherTag" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "gradeLevelTag" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "sectionTag" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "reportPeriod" TEXT;
ALTER TABLE "MediaUpload" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "MediaUpload" ADD COLUMN "verifiedBy" TEXT;

CREATE INDEX "MediaUpload_schoolId_reviewStatus_idx" ON "MediaUpload"("schoolId", "reviewStatus");
CREATE INDEX "MediaUpload_schoolId_reportPeriod_idx" ON "MediaUpload"("schoolId", "reportPeriod");
