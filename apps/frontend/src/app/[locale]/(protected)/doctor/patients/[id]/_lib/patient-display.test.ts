import { describe, expect, it } from 'vitest';
import { shortId } from './patient-display';

describe('shortId', () => {
  it('shows a UUID as its first 8 hex characters, uppercased', () => {
    expect(shortId('3f9a2c1b-7d4e-4a5b-9c8d-0e1f2a3b4c5d')).toBe('3F9A2C1B');
  });

  it('gives nothing for an id that is not a UUID, so the line is omitted rather than showing a truncated slug', () => {
    expect(shortId('patient-profile-4')).toBeNull();
    expect(shortId('PATIENTP')).toBeNull();
  });
});
