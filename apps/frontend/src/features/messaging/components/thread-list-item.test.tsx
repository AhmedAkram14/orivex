import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { ThreadListItem } from '@/features/messaging/components/thread-list-item';
import type { MessageThread } from '@/features/messaging/api/types';
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

function renderItem(thread: MessageThread, selected = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <ThreadListItem thread={thread} selected={selected} onSelect={vi.fn()} />
    </NextIntlClientProvider>,
  );
}

describe('ThreadListItem', () => {
  it('shows the server-resolved counterparty name as the primary line', () => {
    renderItem(buildThread({ counterpartyDisplayName: 'Amina Youssef' }));
    expect(screen.getByText('Amina Youssef')).toBeInTheDocument();
  });

  it('never renders an appointment label -- no appointmentId exists on the thread anymore', () => {
    renderItem(buildThread());
    expect(screen.queryByText(/^Appointment /)).not.toBeInTheDocument();
  });

  it('shows a relative rendering of lastMessageAt as the secondary line', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    renderItem(buildThread({ lastMessageAt: twoHoursAgo }));
    // next-intl's relativeTime -- exact wording isn't this test's concern,
    // only that *some* relative rendering (not a raw ISO timestamp) shows.
    expect(screen.queryByText(twoHoursAgo)).not.toBeInTheDocument();
    expect(screen.getByText(/ago|hour/i)).toBeInTheDocument();
  });

  it('shows the last-message preview, and "No messages yet" instead of a time when the server reports none', () => {
    const { unmount } = renderItem(buildThread({ lastMessagePreview: 'See you Tuesday', unreadCount: 2 }));
    expect(screen.getByText('See you Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    unmount();
    renderItem(buildThread({ lastMessagePreview: null }));
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.queryByText(/ago/i)).not.toBeInTheDocument();
  });

  it('falls back to a generic name when the counterparty lookup failed server-side', () => {
    renderItem(buildThread({ counterpartyDisplayName: undefined }));
    expect(screen.getByText('Conversation')).toBeInTheDocument();
  });
});

describe('ThreadListItem accessible name (Phase 5)', () => {
  it("exposes the button's accessible name starting with the counterparty name, not the avatar's own initial-letter text", () => {
    renderItem(buildThread({ counterpartyDisplayName: 'Ahmed Hassan' }));
    // Before the fix, the avatar's own "A" fallback text node was the FIRST
    // text node inside the button, so the accessible name started with it
    // (e.g. "A, Ahmed Hassan now") -- aria-hidden on the avatar removes it
    // from the name entirely, leaving it start with the real name text (the
    // relative-timestamp line still legitimately follows it).
    expect(screen.getByRole('button', { name: /^Ahmed Hassan/ })).toBeInTheDocument();
  });
});
