import { describe, expect, it } from 'vitest';
import { computeEffectiveWindows } from './effective-window';

describe('computeEffectiveWindows', () => {
  it('returns the full working-hours window when there are zero breaks', () => {
    const result = computeEffectiveWindows({ start: '09:00', end: '17:00' }, []);
    expect(result.bookableWindows).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(result.breaks).toEqual([]);
  });

  it('splits around a single break in the middle of the day', () => {
    // The Monday bug this phase fixes: 10:00-18:00 with a 13:00-18:00 break
    // should surface as one real bookable window, 10:00-13:00.
    const result = computeEffectiveWindows({ start: '10:00', end: '18:00' }, [{ start: '13:00', end: '14:00' }]);
    expect(result.bookableWindows).toEqual([
      { start: '10:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ]);
    expect(result.breaks).toEqual([{ start: '13:00', end: '14:00' }]);
  });

  it('handles a break at the very start of the day', () => {
    const result = computeEffectiveWindows({ start: '09:00', end: '17:00' }, [{ start: '09:00', end: '10:00' }]);
    expect(result.bookableWindows).toEqual([{ start: '10:00', end: '17:00' }]);
    expect(result.breaks).toEqual([{ start: '09:00', end: '10:00' }]);
  });

  it('handles a break at the very end of the day', () => {
    const result = computeEffectiveWindows({ start: '09:00', end: '17:00' }, [{ start: '16:00', end: '17:00' }]);
    expect(result.bookableWindows).toEqual([{ start: '09:00', end: '16:00' }]);
    expect(result.breaks).toEqual([{ start: '16:00', end: '17:00' }]);
  });

  it('handles a break spanning to end-of-day, matching the reported Monday bug exactly', () => {
    const result = computeEffectiveWindows({ start: '10:00', end: '18:00' }, [{ start: '13:00', end: '18:00' }]);
    expect(result.bookableWindows).toEqual([{ start: '10:00', end: '13:00' }]);
    expect(result.breaks).toEqual([{ start: '13:00', end: '18:00' }]);
  });

  it('handles multiple breaks, producing multiple bookable sub-windows', () => {
    const result = computeEffectiveWindows({ start: '08:00', end: '20:00' }, [
      { start: '10:00', end: '10:15' },
      { start: '13:00', end: '14:00' },
      { start: '17:00', end: '17:30' },
    ]);
    expect(result.bookableWindows).toEqual([
      { start: '08:00', end: '10:00' },
      { start: '10:15', end: '13:00' },
      { start: '14:00', end: '17:00' },
      { start: '17:30', end: '20:00' },
    ]);
    expect(result.breaks).toHaveLength(3);
  });

  it('returns no bookable windows when a break covers the entire working day', () => {
    const result = computeEffectiveWindows({ start: '09:00', end: '17:00' }, [{ start: '09:00', end: '17:00' }]);
    expect(result.bookableWindows).toEqual([]);
    expect(result.breaks).toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('ignores a break declared entirely outside the working hours, without extending or shrinking the bookable window', () => {
    const result = computeEffectiveWindows({ start: '10:00', end: '16:00' }, [
      { start: '07:00', end: '08:00' }, // before working hours
      { start: '18:00', end: '19:00' }, // after working hours
    ]);
    expect(result.bookableWindows).toEqual([{ start: '10:00', end: '16:00' }]);
    expect(result.breaks).toEqual([]);
  });

  it('clips a break that only partially overlaps the working hours', () => {
    const result = computeEffectiveWindows({ start: '10:00', end: '16:00' }, [{ start: '08:00', end: '11:00' }]);
    expect(result.bookableWindows).toEqual([{ start: '11:00', end: '16:00' }]);
    expect(result.breaks).toEqual([{ start: '10:00', end: '11:00' }]);
  });

  it('merges two overlapping breaks into one real gap', () => {
    const result = computeEffectiveWindows({ start: '09:00', end: '17:00' }, [
      { start: '12:00', end: '13:30' },
      { start: '13:00', end: '14:00' },
    ]);
    expect(result.bookableWindows).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ]);
    expect(result.breaks).toEqual([{ start: '12:00', end: '14:00' }]);
  });
});
