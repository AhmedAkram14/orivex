import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PatientKnowledgePage from './page';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { authorArticle, moderateArticle, resetKnowledgeStore } from '@/mocks/knowledge-store';
import { resetPatientStore } from '@/mocks/patient-store';
import { decideVerificationCase, resetVerificationCaseStore, submitVerificationCase } from '@/mocks/verification-case-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/patient/knowledge',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_PATIENT_ACCOUNT_ID, email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

afterEach(() => {
  resetKnowledgeStore();
  resetPatientStore();
  resetVerificationCaseStore();
});

function seedPublishedArticle() {
  const submitted = submitVerificationCase({
    subjectAccountId: LEGACY_DOCTOR_ACCOUNT_ID,
    subjectType: 'doctor',
    licenseNumber: 'LIC-2010-4471',
    specialtyCode: 'cardiology',
    documentAssetIds: ['asset-1'],
  });
  decideVerificationCase(submitted.id, 'approved');
  const result = authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'Managing Hypertension at Home', 'Some real, doctor-authored content.');
  if (result.ok) {
    // A brand-new doctor's first article starts Pending Review (the pre-
    // publication threshold) -- approve it here to get a Published article
    // onto the patient-facing feed, mirroring the real admin approval step.
    moderateArticle(result.article.id, 'published', 'Meets content quality guidelines.', 'admin-account-1');
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientKnowledgePage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('PatientKnowledgePage', () => {
  it('browses the published feed and saves an article', async () => {
    seedPublishedArticle();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Managing Hypertension at Home')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Unsave' })[0]).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Saved' }));
    await waitFor(() => expect(screen.queryByText('No articles yet')).not.toBeInTheDocument());
  });
});
