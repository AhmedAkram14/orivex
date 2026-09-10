import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorKnowledgePage from './page';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetKnowledgeStore } from '@/mocks/knowledge-store';
import { decideVerificationCase, resetVerificationCaseStore, submitVerificationCase } from '@/mocks/verification-case-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/knowledge',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

afterEach(() => {
  resetKnowledgeStore();
  resetVerificationCaseStore();
});

function seedVerifiedDoctor() {
  const submitted = submitVerificationCase({
    subjectAccountId: LEGACY_DOCTOR_ACCOUNT_ID,
    subjectType: 'doctor',
    licenseNumber: 'LIC-2010-4471',
    specialtyCode: 'cardiology',
    documentAssetIds: ['asset-1'],
  });
  decideVerificationCase(submitted.id, 'approved');
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorKnowledgePage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorKnowledgePage', () => {
  it('submits a Syndicate-verified doctor\'s first article for pre-publication review', async () => {
    seedVerifiedDoctor();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('No articles yet')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Managing Hypertension at Home');
    await user.type(screen.getByPlaceholderText('Write your article...'), 'Some real, doctor-authored content.');
    await user.click(screen.getByRole('button', { name: 'Publish article' }));

    await waitFor(() => expect(screen.queryByText('No articles yet')).not.toBeInTheDocument());
    expect(screen.getByText('Managing Hypertension at Home')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Submitted for review. An admin will publish it once approved.')).toBeInTheDocument();
  });

  it('shows a Forbidden error when the doctor is not yet Syndicate-verified', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Managing Hypertension at Home');
    await user.type(screen.getByPlaceholderText('Write your article...'), 'Some real, doctor-authored content.');
    await user.click(screen.getByRole('button', { name: 'Publish article' }));

    expect(await screen.findByText("Couldn't submit this article. Please try again.")).toBeInTheDocument();
  });
});
