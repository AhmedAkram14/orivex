import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { QueueEntry } from '@/features/doctor/api/types';
import { toast } from '@/shared/ui/use-toast';

import { useQueueArrivalAnnouncer } from './use-queue-arrival-announcer';

vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

function buildEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: 'entry-1',
    label: 'Amina Youssef',
    status: 'waiting',
    position: 1,
    scheduledAt: new Date().toISOString(),
    ...overrides,
  };
}

const messageFor = (name: string) => ({
  title: 'Patient checked in',
  description: `${name} is now waiting in your queue.`,
  announcement: `${name} has checked in and is now waiting.`,
});

describe('useQueueArrivalAnnouncer', () => {
  it('never announces the first snapshot on mount -- an already-seeded queue is the page loading, not a "new arrival"', () => {
    const entries = [buildEntry({ id: 'entry-1' }), buildEntry({ id: 'entry-2', label: 'Karim Fathy' })];
    const { result } = renderHook(({ data }) => useQueueArrivalAnnouncer(data, messageFor), { initialProps: { data: entries } });

    expect(toast).not.toHaveBeenCalled();
    expect(result.current).toBe('');
  });

  it('toasts and announces a patient who is newly waiting since the last snapshot', () => {
    const first = [buildEntry({ id: 'entry-1' })];
    const { result, rerender } = renderHook(({ data }) => useQueueArrivalAnnouncer(data, messageFor), { initialProps: { data: first } });

    const second = [...first, buildEntry({ id: 'entry-2', label: 'Karim Fathy' })];
    rerender({ data: second });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Patient checked in', description: 'Karim Fathy is now waiting in your queue.' }),
    );
    expect(result.current).toBe('Karim Fathy has checked in and is now waiting.');
  });

  it('does not announce an entry moving out of waiting (e.g. into in-consultation), only a genuinely new arrival', () => {
    const first = [buildEntry({ id: 'entry-1' })];
    const { rerender } = renderHook(({ data }) => useQueueArrivalAnnouncer(data, messageFor), { initialProps: { data: first } });

    vi.mocked(toast).mockClear();
    const second = [buildEntry({ id: 'entry-1', status: 'in-consultation' })];
    rerender({ data: second });

    expect(toast).not.toHaveBeenCalled();
  });
});
