-- Data-loss bug fix: `DoctorProfile.languages` was seeded with full,
-- capitalized English words ('Arabic', 'English', ...) while every piece of
-- application code that reads it (DoctorProfileForm's checkboxes, the
-- onboarding wizard's Professional Info step, the `doctor.profile.
-- languageNames` translation keys) was written against the 2-letter codes
-- ('ar', 'en') the same profile-redesign work standardized on. The mismatch
-- meant the edit form's language checkboxes could never match ('Arabic'
-- !== 'ar'), so they rendered unchecked for every existing doctor even
-- though the read-only view correctly showed languages were set -- and
-- saving the form with those checkboxes silently wiped the field.
--
-- Normalizes every full-word value the seed data ever used (mirroring
-- mocks/doctor-store.ts's own long-standing LANGUAGE_CODES map, which
-- already worked around this same mismatch on the frontend mock layer --
-- 'French' included, even though there is no third-language UI anywhere in
-- the app to actually represent it yet). Idempotent: array_replace is a
-- no-op once a row is already normalized, safe to re-run.
UPDATE "DoctorProfile"
SET "languages" = array_replace(array_replace(array_replace("languages", 'Arabic', 'ar'), 'English', 'en'), 'French', 'fr')
WHERE 'Arabic' = ANY("languages") OR 'English' = ANY("languages") OR 'French' = ANY("languages");
