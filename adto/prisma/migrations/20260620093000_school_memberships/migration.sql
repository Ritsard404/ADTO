CREATE TYPE "SchoolMembershipRole" AS ENUM ('PRINCIPAL', 'SCHOOL_ADMIN', 'DEPARTMENT_HEAD', 'FACULTY_LEAD', 'COORDINATOR', 'VIEWER');
CREATE TYPE "SchoolMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED', 'ENDED');

CREATE TABLE "SchoolMembership" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "roleLabel" "SchoolMembershipRole" NOT NULL DEFAULT 'SCHOOL_ADMIN',
  "status" "SchoolMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitationStatus" TEXT NOT NULL DEFAULT 'ACCEPTED',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolMembership_schoolId_profileId_key" ON "SchoolMembership"("schoolId", "profileId");
CREATE INDEX "SchoolMembership_schoolId_idx" ON "SchoolMembership"("schoolId");
CREATE INDEX "SchoolMembership_profileId_idx" ON "SchoolMembership"("profileId");

ALTER TABLE "SchoolMembership"
ADD CONSTRAINT "SchoolMembership_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolMembership"
ADD CONSTRAINT "SchoolMembership_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
