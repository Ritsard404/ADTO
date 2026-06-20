CREATE TABLE "ScheduleTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationHours" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "gradeLevel" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "subject" TEXT,
    "teacher" TEXT,
    "facilitatorId" TEXT,
    "delivery" TEXT,
    "activity" TEXT,
    "defaultTopic" TEXT,
    "defaultRemarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleTemplate_schoolId_name_key" ON "ScheduleTemplate"("schoolId", "name");
CREATE INDEX "ScheduleTemplate_schoolId_idx" ON "ScheduleTemplate"("schoolId");
CREATE INDEX "ScheduleTemplate_createdById_idx" ON "ScheduleTemplate"("createdById");

ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
