-- CreateTable
CREATE TABLE "ReportHistory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pptFileUrl" TEXT NOT NULL,
    "pdfFileUrl" TEXT NOT NULL,

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportHistory_schoolId_idx" ON "ReportHistory"("schoolId");
CREATE INDEX "ReportHistory_generatedBy_idx" ON "ReportHistory"("generatedBy");

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
