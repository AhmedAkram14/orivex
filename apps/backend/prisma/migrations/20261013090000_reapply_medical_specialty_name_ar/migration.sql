-- Localization fix, re-run: the 20260810120000 backfill set `nameAr` only on
-- specialties that already existed when it ran. On a database migrated
-- first and seeded afterwards (a fresh deploy, CI), the table was empty at
-- that point, so the seed's specialties kept `nameAr` NULL and the Arabic
-- doctor application showed "Cardiology" in English. Same statements,
-- same guard: only rows still NULL, never an admin's own translation,
-- never `name` or any other column. (The seed now writes `nameAr` too.)

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
