import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', false && 'c', undefined, 'd')).toBe('a b d');
  });

  it('resolves conflicting Tailwind utility classes to the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
