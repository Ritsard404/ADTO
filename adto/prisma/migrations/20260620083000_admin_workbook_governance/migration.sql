-- Add workbook-governed school setup fields from AdoptionDetails, Usage QuickView, and Data.
ALTER TABLE "School"
ADD COLUMN "deployedFormId" TEXT,
ADD COLUMN "formNumber" TEXT,
ADD COLUMN "sourceSchoolId" TEXT,
ADD COLUMN "schoolLogoFileId" TEXT,
ADD COLUMN "team" TEXT,
ADD COLUMN "unitHead" TEXT,
ADD COLUMN "supervisor" TEXT,
ADD COLUMN "supervisorEmail" TEXT,
ADD COLUMN "edtechSpecialist" TEXT,
ADD COLUMN "edtechEmail" TEXT,
ADD COLUMN "gradeLevelAdoption" TEXT,
ADD COLUMN "adoptionRemarks" TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT;

CREATE UNIQUE INDEX "School_schoolCode_key" ON "School"("schoolCode");
CREATE UNIQUE INDEX "School_deployedFormId_key" ON "School"("deployedFormId");
CREATE UNIQUE INDEX "School_sourceSchoolId_key" ON "School"("sourceSchoolId");
