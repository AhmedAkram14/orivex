/**
 * Localization fix: picks the Arabic name for admin-managed reference data
 * (medical specialties, and any future lookup table that grows a `nameAr`
 * column) when the current locale is Arabic and a translation exists,
 * falling back to the canonical `name` otherwise -- never a blank string.
 * The backend is still the source of truth for both strings; this is
 * display-only selection, same as every other locale-aware formatting
 * helper in this codebase (e.g. `formatConsultationPrice`).
 */
export function pickLocalizedName(name: string, nameAr: string | null | undefined, locale: string): string {
  return locale === 'ar' && nameAr ? nameAr : name;
}
