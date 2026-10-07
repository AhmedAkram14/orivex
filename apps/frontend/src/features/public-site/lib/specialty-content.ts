/**
 * Which block of editorial copy (`publicSite.specialtyContent.<key>`: summary,
 * conditions, when-to-see bullets, FAQ) describes a specialty. Matched by
 * keyword against the real specialty's English name, the same approach as
 * `getSpecialtyStyle` -- the copy is ours, the specialty list is the DB's.
 * A specialty with no dedicated copy gets the `generic` block, never a 404.
 */
export const SPECIALTY_CONTENT_KEYS = [
  'cardiology',
  'dermatology',
  'dentistry',
  'psychiatry',
  'orthopedics',
  'pediatrics',
  'ophthalmology',
  'internalMedicine',
  'ent',
  'generic',
] as const;

export type SpecialtyContentKey = (typeof SPECIALTY_CONTENT_KEYS)[number];

const MATCHERS: { pattern: RegExp; key: SpecialtyContentKey }[] = [
  { pattern: /cardio|heart/i, key: 'cardiology' },
  { pattern: /dermat|skin/i, key: 'dermatology' },
  { pattern: /dent|oral/i, key: 'dentistry' },
  { pattern: /psychiat|mental/i, key: 'psychiatry' },
  { pattern: /orthop|bone|spine/i, key: 'orthopedics' },
  { pattern: /pediatric|paediatric/i, key: 'pediatrics' },
  { pattern: /ophthalmol|\beye/i, key: 'ophthalmology' },
  { pattern: /internal|family medicine|general medicine/i, key: 'internalMedicine' },
  { pattern: /otolaryng|\bent\b|\bear\b|nose|throat/i, key: 'ent' },
];

export function getSpecialtyContentKey(name: string): SpecialtyContentKey {
  return MATCHERS.find((matcher) => matcher.pattern.test(name))?.key ?? 'generic';
}

/** The number of FAQ entries each `specialtyContent.<key>.faq` block holds (`q1`..`qN`). */
export const SPECIALTY_FAQ_COUNT = 3;
