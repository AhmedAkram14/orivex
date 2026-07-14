import { describe, expect, it } from 'vitest';
import { useFeatureFlag } from './feature-flags';

describe('useFeatureFlag', () => {
  it('resolves to the provided default — no backend ConfigurationModule exists yet', () => {
    expect(useFeatureFlag('any-key')).toBe(false);
    expect(useFeatureFlag('any-key', true)).toBe(true);
  });
});
