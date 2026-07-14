import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dismissToast, toast, useToast } from './use-toast';

describe('toast store', () => {
  it('adds a toast that a subscribed hook can see, and removes it on dismiss', () => {
    const { result } = renderHook(() => useToast());

    let id = '';
    act(() => {
      id = toast({ title: 'Saved', duration: 0 });
    });

    expect(result.current.toasts.some((t) => t.id === id && t.title === 'Saved')).toBe(true);

    act(() => {
      dismissToast(id);
    });

    expect(result.current.toasts.some((t) => t.id === id)).toBe(false);
  });

  it('caps the number of simultaneously visible toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      for (let i = 0; i < 5; i += 1) {
        toast({ title: `Toast ${i}`, duration: 0 });
      }
    });

    expect(result.current.toasts.length).toBeLessThanOrEqual(3);
  });
});
