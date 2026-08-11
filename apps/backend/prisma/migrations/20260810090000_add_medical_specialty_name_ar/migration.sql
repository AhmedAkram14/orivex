-- Localization fix: medical specialty names (e.g. "Cardiology") were a
-- single English-only column, so they rendered untranslated regardless of
-- the caller's locale everywhere they're shown (landing page, doctor
-- search, appointment cards). Additive, nullable column -- every consumer
-- falls back to the existing `name` when unset.

-- AlterTable
ALTER TABLE "MedicalSpecialty" ADD COLUMN "nameAr" TEXT;
