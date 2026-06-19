ALTER TABLE "FacilitatorAssignment" ADD COLUMN "assignedBy" TEXT;

ALTER TYPE "AssignmentStatus" RENAME TO "AssignmentStatus_old";
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED');

ALTER TABLE "FacilitatorAssignment"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "AssignmentStatus"
USING (
  CASE "status"::text
    WHEN 'ENDED' THEN 'COMPLETED'
    WHEN 'PAUSED' THEN 'COMPLETED'
    ELSE "status"::text
  END
)::"AssignmentStatus";

ALTER TABLE "FacilitatorAssignment" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "AssignmentStatus_old";
