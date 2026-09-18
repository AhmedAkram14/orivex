import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import DoctorKnowledgePage from './page';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import { authorArticle, moderateArticle, resetKnowledgeStore } from '@/mocks/knowledge-store';
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

const LONG_BODY = 'Some real, doctor-authored content about managing hypertension at home. '.repeat(4);

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

async function openComposer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Write an article' }));
}

async function selectLanguage(user: ReturnType<typeof userEvent.setup>, language: 'Arabic' | 'English') {
  await user.click(screen.getByRole('combobox', { name: 'Language' }));
  await user.click(await screen.findByRole('option', { name: language }));
}

describe('DoctorKnowledgePage', () => {
  it('submits a Syndicate-verified doctor\'s first article for pre-publication review', async () => {
    seedVerifiedDoctor();
    const user = userEvent.setup({ delay: null });
    renderPage();

    expect(await screen.findByText('No articles yet')).toBeInTheDocument();

    await openComposer(user);
    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Managing Hypertension at Home');
    fireEvent.change(screen.getByPlaceholderText('Write your article... (Markdown supported)'), { target: { value: LONG_BODY } });
    await selectLanguage(user, 'English');

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.queryByText('No articles yet')).not.toBeInTheDocument());
    expect(screen.getByText('Managing Hypertension at Home')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Submitted for review. An admin will publish it once approved.')).toBeInTheDocument();
  });

  it('shows a Forbidden error when the doctor is not yet Syndicate-verified', async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    await openComposer(user);
    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Managing Hypertension at Home');
    fireEvent.change(screen.getByPlaceholderText('Write your article... (Markdown supported)'), { target: { value: LONG_BODY } });
    await selectLanguage(user, 'English');

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText("Couldn't save this article. Please try again.")).toBeInTheDocument();
  });

  it('saves a draft with no length floor', async () => {
    seedVerifiedDoctor();
    const user = userEvent.setup({ delay: null });
    renderPage();

    await openComposer(user);
    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'A');
    await user.type(screen.getByPlaceholderText('Write your article... (Markdown supported)'), 'Too short for review.');
    await selectLanguage(user, 'English');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(screen.getByText('Draft')).toBeInTheDocument());
  });

  it('disables Submit for review and explains why until the length floor is met', async () => {
    seedVerifiedDoctor();
    const user = userEvent.setup({ delay: null });
    renderPage();

    await openComposer(user);
    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Too short');
    await selectLanguage(user, 'English');

    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
    expect(
      screen.getByText(
        "Submitting for review needs a title of at least 10 characters and a body of at least 200 characters. Save as a draft to keep working on it.",
      ),
    ).toBeInTheDocument();
  });

  it('renders a live preview of the in-progress draft', async () => {
    seedVerifiedDoctor();
    const user = userEvent.setup({ delay: null });
    renderPage();

    await openComposer(user);
    await user.type(screen.getByPlaceholderText('e.g. Managing Hypertension at Home'), 'Preview Me');
    await user.type(screen.getByPlaceholderText('Write your article... (Markdown supported)'), '**Bold** body text');
    await selectLanguage(user, 'Arabic');

    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('Preview Me')).toBeInTheDocument();
  });

  it('shows the re-review confirmation copy when editing an already-published article', async () => {
    seedVerifiedDoctor();
    const result = authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'Already Live Article', LONG_BODY, 'English');
    if (result.ok) {
      moderateArticle(result.article.id, 'published', 'Meets content quality guidelines.', 'admin-account-1');
    }

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Already Live Article');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Submit for review' }));

    expect(
      await screen.findByText(
        'This replaces the currently-published version immediately upon submission and will not be visible to patients again until an admin re-approves it.',
      ),
    ).toBeInTheDocument();
  });

  it('searches, filters by status, and sorts the article list', async () => {
    seedVerifiedDoctor();
    const draftResult = authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'A Draft About Diabetes', 'Short.', 'English', undefined, true);
    const publishedResult = authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'A Published Article', LONG_BODY, 'English');
    if (publishedResult.ok) {
      moderateArticle(publishedResult.article.id, 'published', 'Meets content quality guidelines.', 'admin-account-1');
    }
    expect(draftResult.ok).toBe(true);

    renderPage();
    const user = userEvent.setup({ delay: null });

    await screen.findByText('A Draft About Diabetes');
    expect(screen.getByText('A Published Article')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search by title...'), 'Diabetes');
    expect(screen.getByText('A Draft About Diabetes')).toBeInTheDocument();
    expect(screen.queryByText('A Published Article')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search by title...'));
    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'Published' }));

    expect(screen.getByText('A Published Article')).toBeInTheDocument();
    expect(screen.queryByText('A Draft About Diabetes')).not.toBeInTheDocument();
  });

  it('shows a distinct "no results" state when filters/search match nothing, unlike the true empty state', async () => {
    seedVerifiedDoctor();
    authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'A Draft About Diabetes', 'Short.', 'English', undefined, true);

    renderPage();
    const user = userEvent.setup({ delay: null });

    await screen.findByText('A Draft About Diabetes');
    await user.type(screen.getByPlaceholderText('Search by title...'), 'Nothing matches this');

    expect(await screen.findByText('No articles match your filters')).toBeInTheDocument();
    expect(screen.queryByText('No articles yet')).not.toBeInTheDocument();
  });

  it('unpublishes a published article after a confirm dialog with a reason', async () => {
    seedVerifiedDoctor();
    const result = authorArticle(LEGACY_DOCTOR_ACCOUNT_ID, 'To Be Unpublished', LONG_BODY, 'English');
    if (result.ok) {
      moderateArticle(result.article.id, 'published', 'Meets content quality guidelines.', 'admin-account-1');
    }

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('To Be Unpublished');
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('Why are you unpublishing this article?'), 'No longer accurate.');
    await user.click(within(dialog).getByRole('button', { name: 'Unpublish' }));

    await waitFor(() => expect(screen.getByText('Archived')).toBeInTheDocument());
  });
});
