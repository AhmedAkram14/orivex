-- Demo Data & Profile Avatar Pass: a cached display pointer on Account
-- (always a root-relative path served by the frontend's own public/
-- folder, e.g. "/demo/avatars/doctor-01.png"), never a MediaAsset
-- presigned URL. Additive, nullable column; no existing rows are affected
-- and no real user has one set until a future upload feature exists -- they
-- simply fall back to the existing initials avatar, same as always.

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "avatarUrl" TEXT;
