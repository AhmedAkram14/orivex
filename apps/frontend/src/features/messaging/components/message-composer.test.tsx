import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MessageComposer } from '@/features/messaging/components/message-composer';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { listMessages, resetMessagingStore, startOrGetThread } from '@/mocks/messaging-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

// Phase 2's typing-indicator emit -- verified below to still fire once the
// composer is wrapped in a real <form> (Phase 4).
const fakeSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
vi.mock('@/shared/lib/realtime/use-realtime-socket', () => ({
  getRealtimeSocket: () => fakeSocket,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
  fakeSocket.emit.mockClear();
});
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderComposer(threadId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <MessageComposer threadId={threadId} recipientAccountId={LEGACY_PATIENT_ACCOUNT_ID} />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function setup() {
  const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
  renderComposer(thread.id);
  const textarea = screen.getByPlaceholderText('Write a message…') as HTMLTextAreaElement;
  return { thread, textarea };
}

describe('MessageComposer form semantics', () => {
  it('sends on Enter (existing onKeyDown path, must survive the <form> wrap)', async () => {
    const { thread, textarea } = setup();
    fireEvent.change(textarea, { target: { value: 'Hello via Enter' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => expect(listMessages(thread.id).some((m) => m.body === 'Hello via Enter')).toBe(true));
  });

  it('does not send on Shift+Enter', () => {
    const { textarea } = setup();
    fireEvent.change(textarea, { target: { value: 'Multi\nline' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(textarea.value).toBe('Multi\nline');
  });

  it('sends via the submit button (type="submit")', async () => {
    const { thread, textarea } = setup();
    fireEvent.change(textarea, { target: { value: 'Hello via button' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(listMessages(thread.id).some((m) => m.body === 'Hello via button')).toBe(true));
  });

  it('sends on a raw form submit event (mobile/IME "Go" submission, no keydown at all)', async () => {
    const { thread, textarea } = setup();
    fireEvent.change(textarea, { target: { value: 'Hello via Go' } });
    const form = textarea.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => expect(listMessages(thread.id).some((m) => m.body === 'Hello via Go')).toBe(true));
  });

  it('shows the Enter/Shift+Enter helper text', () => {
    setup();
    expect(screen.getByText('Enter to send, Shift+Enter for a new line')).toBeInTheDocument();
  });

  it('still emits messaging.typing while the user types after the <form> wrap', () => {
    const { textarea } = setup();
    fireEvent.change(textarea, { target: { value: 'typing...' } });
    expect(fakeSocket.emit).toHaveBeenCalledWith('messaging.typing', expect.objectContaining({ recipientAccountId: LEGACY_PATIENT_ACCOUNT_ID }));
  });
});

describe('MessageComposer auto-grow textarea', () => {
  it('grows height to fit content, capped at roughly 6 lines', () => {
    const { textarea } = setup();
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 40 });
    fireEvent.change(textarea, { target: { value: 'a couple lines\nof text' } });
    expect(textarea.style.height).toBe('40px');

    // A huge amount of content should be clamped, not left to grow forever.
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 5000 });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2000) } });
    const cappedHeight = parseFloat(textarea.style.height);
    expect(cappedHeight).toBeLessThan(5000);
    expect(cappedHeight).toBeGreaterThan(0);
  });
});

describe('MessageComposer file attachment constraints', () => {
  it('rejects an oversized file with a visible message and never starts the upload', async () => {
    setup();
    const oversized = new File(['x'.repeat(11 * 1024 * 1024)], 'scan.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [oversized] } });

    expect(await screen.findByText("That file is too large. The limit is 10MB.")).toBeInTheDocument();
    expect(screen.queryByText('scan.pdf')).not.toBeInTheDocument();
  });

  it('rejects a disallowed file type with a visible message and never starts the upload', async () => {
    setup();
    const badType = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [badType] } });

    expect(await screen.findByText("That file type isn't supported. Attach a PDF or image (JPG/PNG).")).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('shows the accept/size hint near the attach button', () => {
    setup();
    expect(screen.getByText('PDF or image, up to 10MB')).toBeInTheDocument();
  });

  it('mirrors the clinical-document-upload accept precedent on the hidden file input', () => {
    setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('.pdf,.jpg,.jpeg,.png');
    expect(input.hasAttribute('multiple')).toBe(false);
  });
});
