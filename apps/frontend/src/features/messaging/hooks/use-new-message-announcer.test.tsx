import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { MessageThread } from '@/features/messaging/api/types';
import { useNewMessageAnnouncer } from '@/features/messaging/hooks/use-new-message-announcer';
import enMessages from '../../../../messages/en.json';

function buildThread(overrides: Partial<MessageThread> = {}): MessageThread {
  return {
    id: 'thread-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    counterpartyDisplayName: 'Amina Youssef',
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      {children}
    </NextIntlClientProvider>
  );
}

describe('useNewMessageAnnouncer', () => {
  it('never announces the first snapshot on mount -- the inbox loading its starting state is not a "new message"', () => {
    const threads = [buildThread({ id: 'thread-1' }), buildThread({ id: 'thread-2', counterpartyDisplayName: 'Karim Fathy' })];
    const { result } = renderHook(({ data }) => useNewMessageAnnouncer(data), { wrapper, initialProps: { data: threads } });

    expect(result.current).toBe('');
  });

  it('announces a thread whose lastMessageAt genuinely advanced since the last snapshot', () => {
    const first = [buildThread({ id: 'thread-1', lastMessageAt: new Date(Date.now() - 60_000).toISOString() })];
    const { result, rerender } = renderHook(({ data }) => useNewMessageAnnouncer(data), { wrapper, initialProps: { data: first } });

    const second = [buildThread({ id: 'thread-1', counterpartyDisplayName: 'Amina Youssef', lastMessageAt: new Date().toISOString() })];
    rerender({ data: second });

    expect(result.current).toBe('New message from Amina Youssef.');
  });

  it('does not announce a brand-new thread that has no previous snapshot to have advanced from', () => {
    const first = [buildThread({ id: 'thread-1' })];
    const { result, rerender } = renderHook(({ data }) => useNewMessageAnnouncer(data), { wrapper, initialProps: { data: first } });

    const second = [...first, buildThread({ id: 'thread-2', counterpartyDisplayName: 'Karim Fathy' })];
    rerender({ data: second });

    expect(result.current).toBe('');
  });

  it('does not announce a thread whose lastMessageAt is unchanged', () => {
    const timestamp = new Date().toISOString();
    const first = [buildThread({ id: 'thread-1', lastMessageAt: timestamp })];
    const { result, rerender } = renderHook(({ data }) => useNewMessageAnnouncer(data), { wrapper, initialProps: { data: first } });

    rerender({ data: [buildThread({ id: 'thread-1', lastMessageAt: timestamp })] });

    expect(result.current).toBe('');
  });
});
