import { describe, expect, it, vi } from 'vitest';
import { createMemoryTokenStorage } from './token-storage';

describe('createMemoryTokenStorage', () => {
  it('starts empty', () => {
    const storage = createMemoryTokenStorage();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getExpiresAt()).toBeNull();
  });

  it('stores and returns the access token and expiry', () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('abc123', '2030-01-01T00:00:00.000Z');
    expect(storage.getAccessToken()).toBe('abc123');
    expect(storage.getExpiresAt()).toBe('2030-01-01T00:00:00.000Z');
  });

  it('clears both values', () => {
    const storage = createMemoryTokenStorage();
    storage.setAccessToken('abc123', '2030-01-01T00:00:00.000Z');
    storage.clear();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getExpiresAt()).toBeNull();
  });

  it('isolates separate instances from each other', () => {
    const a = createMemoryTokenStorage();
    const b = createMemoryTokenStorage();
    a.setAccessToken('a-token', '2030-01-01T00:00:00.000Z');
    expect(b.getAccessToken()).toBeNull();
  });

  it('notifies subscribers on both setAccessToken and clear', () => {
    const storage = createMemoryTokenStorage();
    const listener = vi.fn();
    storage.subscribe(listener);

    storage.setAccessToken('abc123', '2030-01-01T00:00:00.000Z');
    storage.clear();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying a subscriber once it unsubscribes', () => {
    const storage = createMemoryTokenStorage();
    const listener = vi.fn();
    const unsubscribe = storage.subscribe(listener);
    unsubscribe();

    storage.setAccessToken('abc123', '2030-01-01T00:00:00.000Z');

    expect(listener).not.toHaveBeenCalled();
  });
});
