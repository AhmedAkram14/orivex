import {
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  HeartPulse,
  ScanLine,
  Smile,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from 'lucide-react';

/** The nine fixed categorical hues (`--color-spec-N` / `--color-spec-N-tint`). */
export type SpecialtyHue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpecialtyStyle {
  /** Stable i18n key under `landing.specialties.categories` (`generic` when nothing matched). */
  key: string;
  icon: LucideIcon;
  hue: SpecialtyHue;
}

/**
 * Static class strings (not built from `hue` at runtime) so Tailwind's
 * scanner sees every one of them. Chips and icon tiles ONLY -- the same hue for
 * the same specialty on the landing page, the doctor directory and the
 * specialties page.
 */
export const SPECIALTY_HUE_CLASSES: Record<SpecialtyHue, { tile: string; glyph: string }> = {
  1: { tile: 'bg-spec-1-tint', glyph: 'text-spec-1' },
  2: { tile: 'bg-spec-2-tint', glyph: 'text-spec-2' },
  3: { tile: 'bg-spec-3-tint', glyph: 'text-spec-3' },
  4: { tile: 'bg-spec-4-tint', glyph: 'text-spec-4' },
  5: { tile: 'bg-spec-5-tint', glyph: 'text-spec-5' },
  6: { tile: 'bg-spec-6-tint', glyph: 'text-spec-6' },
  7: { tile: 'bg-spec-7-tint', glyph: 'text-spec-7' },
  8: { tile: 'bg-spec-8-tint', glyph: 'text-spec-8' },
  9: { tile: 'bg-spec-9-tint', glyph: 'text-spec-9' },
};

// Matched by keyword against the real specialty name -- purely cosmetic (which
// icon/hue a specialty gets), never a source of truth about what it is. Each
// category owns one hue outright, so a specialty looks identical everywhere.
const CATEGORIES: { pattern: RegExp; key: string; icon: LucideIcon; hue: SpecialtyHue }[] = [
  { pattern: /orthop|bone|spine/i, key: 'orthopedics', icon: Bone, hue: 5 },
  { pattern: /anesthes/i, key: 'anesthesiology', icon: Syringe, hue: 8 },
  { pattern: /dent|oral/i, key: 'dentistry', icon: Smile, hue: 3 },
  { pattern: /pediatric/i, key: 'pediatrics', icon: Baby, hue: 6 },
  { pattern: /radiol|imaging/i, key: 'radiology', icon: ScanLine, hue: 2 },
  { pattern: /cardio|heart/i, key: 'cardiology', icon: HeartPulse, hue: 1 },
  { pattern: /neuro|brain/i, key: 'neurology', icon: Brain, hue: 4 },
  { pattern: /psychiat|mental/i, key: 'psychiatry', icon: Brain, hue: 4 },
  { pattern: /ophthalmol|\beye/i, key: 'ophthalmology', icon: Eye, hue: 7 },
  { pattern: /\bent\b|\bear\b|nose|throat/i, key: 'ent', icon: Ear, hue: 9 },
];

function hashHue(value: string): SpecialtyHue {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return ((Math.abs(hash) % 9) + 1) as SpecialtyHue;
}

/** Resolves a specialty's icon + hue from its (English) name. Unmatched names get a stethoscope and a hash-stable hue. */
export function getSpecialtyStyle(name: string): SpecialtyStyle {
  const matched = CATEGORIES.find((category) => category.pattern.test(name));
  if (matched) return matched;
  return { key: 'generic', icon: Stethoscope, hue: hashHue(name) };
}
