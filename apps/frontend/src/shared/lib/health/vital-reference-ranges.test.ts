import { describe, expect, it } from 'vitest';
import { flagBloodPressure, flagGlucose } from './vital-reference-ranges';

describe('flagBloodPressure', () => {
  it('does not flag a value within the reference range', () => {
    expect(flagBloodPressure(110, 70)).toBeNull();
  });

  it('does not flag exactly at the upper boundary', () => {
    expect(flagBloodPressure(120, 80)).toBeNull();
  });

  it('flags above the reference range and carries the numeric range used (label text lives in i18n, not here)', () => {
    const flag = flagBloodPressure(135, 85);
    expect(flag?.direction).toBe('above');
    expect(flag?.range).toBe('90-120/60-80 mmHg');
  });

  it('flags below the reference range', () => {
    const flag = flagBloodPressure(85, 55);
    expect(flag?.direction).toBe('below');
  });

  it('flags when only the diastolic value is out of range', () => {
    expect(flagBloodPressure(110, 90)?.direction).toBe('above');
  });
});

describe('flagGlucose', () => {
  it('does not flag the low boundary value (70)', () => {
    expect(flagGlucose(70)).toBeNull();
  });

  it('flags below 70', () => {
    expect(flagGlucose(69)?.direction).toBe('below');
  });

  it('does not flag the high boundary value (200)', () => {
    expect(flagGlucose(200)).toBeNull();
  });

  it('flags above 200', () => {
    expect(flagGlucose(201)?.direction).toBe('above');
  });

  it('does not flag a mid-range value that could be normal fasting or post-meal', () => {
    expect(flagGlucose(140)).toBeNull();
    expect(flagGlucose(85)).toBeNull();
  });
});
