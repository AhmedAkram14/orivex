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

describe('cn with the design-system type scale', () => {
  it('keeps a scale size next to a text colour instead of treating it as a conflicting colour', () => {
    expect(cn('font-display text-h1', 'text-text-primary')).toBe('font-display text-h1 text-text-primary');
  });

  it('still lets a later size override an earlier one', () => {
    expect(cn('text-h1', 'text-small')).toBe('text-small');
    expect(cn('text-caption', 'text-sm')).toBe('text-sm');
  });
});
