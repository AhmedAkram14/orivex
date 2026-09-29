import { describe, expect, it } from 'vitest';
import { getSpecialtyStyle } from './specialty-palette';

// The specialties the platform is seeded with (mocks/reference-store.ts, mirroring the backend seed).
const SEEDED = [
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Psychiatry',
  'Internal Medicine',
  'Orthopedics',
  'Dentistry',
  'Otolaryngology (ENT)',
  'Ophthalmology',
];

describe('getSpecialtyStyle', () => {
  it('gives each seeded specialty its own hue', () => {
    const hues = SEEDED.map((name) => getSpecialtyStyle(name).hue);
    expect(new Set(hues).size).toBe(SEEDED.length);
  });

  it('is stable: the same name always resolves to the same hue', () => {
    expect(getSpecialtyStyle('Nephrology').hue).toBe(getSpecialtyStyle('Nephrology').hue);
  });
});
