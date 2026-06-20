ALTER TABLE "ACESession"
ADD COLUMN "sourceWorkbookFile" TEXT,
ADD COLUMN "sourceRowRange" TEXT,
ADD COLUMN "sourceDeployedFormId" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

ALTER TABLE "ACEProject"
ADD COLUMN "sourceSheet" TEXT,
ADD COLUMN "sourceWorkbookFile" TEXT,
ADD COLUMN "sourceRowRange" TEXT,
ADD COLUMN "sourceDeployedFormId" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

ALTER TABLE "InventoryItem"
ADD COLUMN "issuedQuantity" INTEGER,
ADD COLUMN "totalQuantity" INTEGER,
ADD COLUMN "borrowedStatus" TEXT,
ADD COLUMN "completenessStatus" TEXT,
ADD COLUMN "facilitatorSignOff" TEXT,
ADD COLUMN "sourceSheet" TEXT,
ADD COLUMN "sourceWorkbookFile" TEXT,
ADD COLUMN "sourceRowRange" TEXT,
ADD COLUMN "sourceDeployedFormId" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

ALTER TABLE "MediaUpload"
ADD COLUMN "projectId" TEXT;

ALTER TABLE "MediaUpload"
ADD CONSTRAINT "MediaUpload_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ACEProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MediaUpload_projectId_idx" ON "MediaUpload"("projectId");
