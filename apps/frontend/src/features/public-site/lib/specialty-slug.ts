import type { PublicSpecialty } from '@/features/landing/api/types';

/**
 * A specialty's URL slug, derived from its canonical English name (unique in
 * `MedicalSpecialty.name`), e.g. "Otolaryngology (ENT)" -> "otolaryngology-ent".
 * Derived rather than stored: no schema change, and the same name always
 * yields the same slug in every locale (Arabic pages share the English slug).
 */
export function toSpecialtySlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findSpecialtyBySlug(specialties: readonly PublicSpecialty[], slug: string): PublicSpecialty | undefined {
  return specialties.find((specialty) => toSpecialtySlug(specialty.name) === slug);
}
