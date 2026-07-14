import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { toUserMessage } from './error';

describe('toUserMessage', () => {
  it('uses the ApiError message for a known backend error', () => {
    const error = new ApiError(409, {
      code: 'CONFLICT',
      message: 'This slot was just taken.',
      requestId: 'req-1',
      timestamp: new Date().toISOString(),
    });
    expect(toUserMessage(error)).toBe('This slot was just taken.');
  });

  it('uses a generic Error message when not an ApiError', () => {
    expect(toUserMessage(new Error('Network down'))).toBe('Network down');
  });

  it('falls back to a generic message for a non-Error throw', () => {
    expect(toUserMessage('a plain string was thrown')).toBe('Something went wrong. Please try again.');
  });
});
