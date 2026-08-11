-- Localization fix (data backfill): the `nameAr` column added in
-- 20260810090000_add_medical_specialty_name_ar has been sitting NULL for
-- every real seeded specialty (no admin UI exists yet to enter translations
-- one at a time), so the frontend's locale-picking helper correctly falls
-- back to the English `name` -- the code was right, the data was missing.
-- This backfills real Arabic names for this platform's standard specialty
-- list. Idempotent and safe to re-run: only ever sets `nameAr` where it is
-- still NULL, so it never overwrites a translation an admin has since
-- entered by hand, and never touches `name`, `isActive`, or any other row.

UPDATE "MedicalSpecialty" SET "nameAr" = 'طب الأسنان' WHERE "name" = 'Dentistry' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'أمراض القلب' WHERE "name" = 'Cardiology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'التخدير' WHERE "name" = 'Anesthesiology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'طب الأسرة' WHERE "name" = 'Family Medicine' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الغدد الصماء' WHERE "name" = 'Endocrinology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الأمراض الجلدية' WHERE "name" = 'Dermatology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الطب الباطني' WHERE "name" = 'Internal Medicine' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الجراحة العامة' WHERE "name" = 'General Surgery' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'أمراض الجهاز الهضمي' WHERE "name" = 'Gastroenterology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'أمراض النساء والتوليد' WHERE "name" = 'Obstetrics & Gynecology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'طب الأعصاب' WHERE "name" = 'Neurology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'أمراض الكلى' WHERE "name" = 'Nephrology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'جراحة العظام' WHERE "name" = 'Orthopedics' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'طب وجراحة العيون' WHERE "name" = 'Ophthalmology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'علاج الأورام' WHERE "name" = 'Oncology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الطب النفسي' WHERE "name" = 'Psychiatry' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'طب الأطفال' WHERE "name" = 'Pediatrics' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'أنف وأذن وحنجرة' WHERE "name" = 'Otolaryngology (ENT)' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'المسالك البولية' WHERE "name" = 'Urology' AND "nameAr" IS NULL;
UPDATE "MedicalSpecialty" SET "nameAr" = 'الأشعة' WHERE "name" = 'Radiology' AND "nameAr" IS NULL;
