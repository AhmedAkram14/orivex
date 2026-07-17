-- SchedulingModule's own aggregates (docs/05-information-architecture.md,
-- docs/09-physical-database.md): the doctor's own recurring weekly working
-- hours (WorkingHoursDay, always exactly 7 rows per doctor -- enforced in
-- application code, not here), one-off schedule exceptions
-- (vacation/unavailable/extra-hours), and a global, doctor-agnostic Holiday
-- calendar (read-only for now -- no create use case exists yet, same
-- "real read, deferred write" pattern used for Notification). CASCADE from
-- DoctorProfile on WorkingHoursDay/ScheduleException: neither has meaning
-- without the doctor it belongs to.

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('VACATION', 'UNAVAILABLE', 'EXTRA_HOURS');

-- CreateTable
CREATE TABLE "WorkingHoursDay" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" "WeekDay" NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breaks" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingHoursDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleException" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ScheduleExceptionType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHoursDay_doctorId_dayOfWeek_key" ON "WorkingHoursDay"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "WorkingHoursDay_doctorId_idx" ON "WorkingHoursDay"("doctorId");

-- CreateIndex
CREATE INDEX "ScheduleException_doctorId_idx" ON "ScheduleException"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- AddForeignKey
ALTER TABLE "WorkingHoursDay" ADD CONSTRAINT "WorkingHoursDay_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
