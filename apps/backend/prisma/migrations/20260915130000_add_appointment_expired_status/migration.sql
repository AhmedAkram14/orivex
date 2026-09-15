-- AlterEnum
-- Phase 0 (stale-request terminal state): a Requested appointment nobody
-- ever answered before its scheduledAt passed now has its own terminal
-- status instead of silently disappearing from "upcoming work" views.

ALTER TYPE "AppointmentStatus" ADD VALUE 'EXPIRED';
