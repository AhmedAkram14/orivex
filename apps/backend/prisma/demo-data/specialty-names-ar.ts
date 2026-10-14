// Arabic names for the platform's standard specialty list -- the same values
// the 20260810120000 backfill migration (and its 20261013090000 re-run) writes.
// The seed creates specialties with these, and fills in any it finds without
// one, so a database seeded after the backfill migration never ends up with
// English-only specialties (the frontend falls back to `name` when `nameAr`
// is null, which showed "Cardiology" on the Arabic doctor application).
export const SPECIALTY_NAMES_AR: Readonly<Record<string, string>> = {
  Dentistry: 'طب الأسنان',
  Cardiology: 'أمراض القلب',
  Anesthesiology: 'التخدير',
  'Family Medicine': 'طب الأسرة',
  Endocrinology: 'الغدد الصماء',
  Dermatology: 'الأمراض الجلدية',
  'Internal Medicine': 'الطب الباطني',
  'General Surgery': 'الجراحة العامة',
  Gastroenterology: 'أمراض الجهاز الهضمي',
  'Obstetrics & Gynecology': 'أمراض النساء والتوليد',
  Neurology: 'طب الأعصاب',
  Nephrology: 'أمراض الكلى',
  Orthopedics: 'جراحة العظام',
  Ophthalmology: 'طب وجراحة العيون',
  Oncology: 'علاج الأورام',
  Psychiatry: 'الطب النفسي',
  Pediatrics: 'طب الأطفال',
  'Otolaryngology (ENT)': 'أنف وأذن وحنجرة',
  Urology: 'المسالك البولية',
  Radiology: 'الأشعة',
};
