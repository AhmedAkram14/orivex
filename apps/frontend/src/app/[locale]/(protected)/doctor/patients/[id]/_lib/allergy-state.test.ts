import { describe, expect, it } from 'vitest';
import { getAllergyState } from './allergy-state';

const NOW = new Date('2026-09-23T12:00:00.000Z');
const DAY_MS = 86_400_000;

describe('getAllergyState', () => {
  it('returns not-asked when neither allergies nor a confirmation is on record', () => {
    expect(getAllergyState({}, NOW)).toEqual({ kind: 'not-asked' });
  });

  it('returns present when allergies text is set, regardless of any confirmation fields', () => {
    const state = getAllergyState({ allergies: 'Penicillin' }, NOW);
    expect(state).toEqual({ kind: 'present', text: 'Penicillin' });
  });

  it('returns confirmed-none with a name when both the timestamp and the doctor name are present', () => {
    const confirmedAt = new Date(NOW.getTime() - 10 * DAY_MS).toISOString();
    const state = getAllergyState(
      { allergiesConfirmedNoneAt: confirmedAt, allergiesConfirmedByName: 'Dr. Sarah Ahmed' },
      NOW,
    );
    expect(state.kind).toBe('confirmed-none');
    if (state.kind === 'confirmed-none') {
      expect(state.confirmedByName).toBe('Dr. Sarah Ahmed');
      expect(state.isAged).toBe(false);
    }
  });

  // This is the state most existing data is in: every confirmation recorded
  // before allergiesConfirmedByDoctorId existed has no doctor name to show.
  it('returns confirmed-none with no name when the doctor id could not be resolved (pre-existing data)', () => {
    const confirmedAt = new Date(NOW.getTime() - 10 * DAY_MS).toISOString();
    const state = getAllergyState({ allergiesConfirmedNoneAt: confirmedAt }, NOW);
    expect(state.kind).toBe('confirmed-none');
    if (state.kind === 'confirmed-none') {
      expect(state.confirmedByName).toBeUndefined();
      expect(state.isAged).toBe(false);
    }
  });

  it('flags a confirmation older than a year as aged', () => {
    const confirmedAt = new Date(NOW.getTime() - 400 * DAY_MS).toISOString();
    const state = getAllergyState({ allergiesConfirmedNoneAt: confirmedAt, allergiesConfirmedByName: 'Dr. X' }, NOW);
    expect(state.kind).toBe('confirmed-none');
    if (state.kind === 'confirmed-none') {
      expect(state.isAged).toBe(true);
    }
  });
});
