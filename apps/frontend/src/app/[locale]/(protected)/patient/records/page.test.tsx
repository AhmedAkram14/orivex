import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PatientMedicalRecordsPage from './page';
import { server } from '@/mocks/server';
import { LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetMediaAssetStore, setDocumentsForAccount, setResultNodesForAccount } from '@/mocks/media-asset-store';
import { resetPatientStore, setPatientDashboardState, setPatientVerified } from '@/mocks/patient-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/patient/records',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => searchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetPatientStore();
  resetMediaAssetStore();
  searchParams = new URLSearchParams();
  push.mockReset();
});
afterAll(() => server.close());

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] },
};

const soap = (s: string, o: string, a: string, p: string) => `S: ${s}\n\nO: ${o}\n\nA: ${a}\n\nP: ${p}`;

function seedRecords() {
  setPatientDashboardState(LEGACY_PATIENT_ACCOUNT_ID, {
    medicalRecords: [
      {
        id: 'visit-new',
        type: 'visit',
        date: '2026-08-17T08:20:00.000Z',
        title: 'Clinical visit',
        doctorName: 'Dr. Omar Hassan',
        description: soap('Morning headaches.', 'BP 134/86.', 'Hypertension, improving.', 'Continue amlodipine.'),
      },
      {
        id: 'visit-old',
        type: 'visit',
        date: '2026-07-02T13:05:00.000Z',
        title: 'Clinical visit',
        doctorName: 'Dr. Salma Adel',
        description: soap('Itchy forearms.', 'Scaly plaques.', 'Mild atopic eczema.', 'Moisturiser twice daily.'),
      },
      { id: 'condition-1', type: 'condition', date: '2026-07-02T13:20:00.000Z', title: 'Atopic eczema', doctorName: 'Dr. Salma Adel' },
      { id: 'condition-2', type: 'condition', date: '2026-06-20T07:55:00.000Z', title: 'Hypertension, stage 1', doctorName: 'Dr. Omar Hassan' },
    ],
  });
  setDocumentsForAccount(LEGACY_PATIENT_ACCOUNT_ID, [
    {
      id: 'doc-1',
      ownerAccountId: LEGACY_PATIENT_ACCOUNT_ID,
      purpose: 'lab_report',
      contentType: 'application/pdf',
      createdAt: '2026-06-24T06:10:00.000Z',
      signedUrl: 'http://localhost:4000/mock-object-storage/doc-1',
    },
  ]);
  setResultNodesForAccount(LEGACY_PATIENT_ACCOUNT_ID, [
    { id: 'lab-1', nodeType: 'lab_result', description: 'HbA1c 5.6%', source: 'clinical', createdAt: '2026-06-24T06:00:00.000Z' },
    { id: 'imaging-1', nodeType: 'radiology_result', description: 'Chest X-ray: clear lungs', source: 'clinical', createdAt: '2026-06-21T10:30:00.000Z' },
  ]);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={patientState}>
          <PatientMedicalRecordsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const tab = (name: RegExp) => screen.getByRole('tab', { name });
const activePanel = () => screen.getByRole('tabpanel');
const recordIds = (container: HTMLElement) => [...container.querySelectorAll('[data-record-id]')].map((el) => el.getAttribute('data-record-id'));

describe('PatientMedicalRecordsPage', () => {
  beforeEach(() => setPatientVerified(true));

  it('shows honest empty states for a new account, with the upload action on the header and the empty documents card', async () => {
    renderPage();

    expect(await screen.findByText('No conditions on record')).toBeInTheDocument();
    expect(screen.getByText('No visits yet')).toBeInTheDocument();
    expect(await screen.findByText('No lab or imaging results yet')).toBeInTheDocument();
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
    // Last visit: a dash, explained by its caption.
    expect(screen.getByText('No visit notes yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Upload document' }).length).toBe(2);
    // No Active prescriptions here: medications live on Prescriptions, linked from the tab bar.
    expect(screen.queryByText('Active prescriptions')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Medications.*Prescriptions/ })).toHaveAttribute('href', '/en/patient/prescriptions');
  });

  it('counts in the summary and the tabs come from the same lists, and Last visit is the newest visit record', async () => {
    seedRecords();
    renderPage();

    await screen.findByText('Hypertension, improving.');
    await screen.findByText('HbA1c 5.6%');
    expect(tab(/Visits/)).toHaveAttribute('data-count', '2');
    expect(tab(/Conditions/)).toHaveAttribute('data-count', '2');
    expect(tab(/Documents/)).toHaveAttribute('data-count', '1');
    expect(tab(/Labs & imaging/)).toHaveAttribute('data-count', '2');
    expect(tab(/Visits/)).toHaveTextContent('Visits2');

    const summary = (label: string) => screen.getByText(label, { selector: 'p' }).parentElement!;
    expect(summary('Visits')).toHaveTextContent('2');
    expect(summary('Conditions')).toHaveTextContent('2');
    expect(summary('Documents')).toHaveTextContent('1');
    // Aug 17 is the newest visit note -- never a completed appointment with no note.
    expect(summary('Last visit')).toHaveTextContent('Aug 17');
  });

  it('never renders one record twice on the Overview', async () => {
    seedRecords();
    renderPage();
    await screen.findByText('HbA1c 5.6%');
    await screen.findByText('Lab report');

    const ids = recordIds(activePanel());
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    // The latest visit, the conditions, the latest results and the documents -- each once.
    expect(ids).toEqual(expect.arrayContaining(['visit-new', 'condition-1', 'condition-2', 'lab-1', 'imaging-1', 'doc-1']));
    expect(ids).not.toContain('visit-old');
  });

  it('keeps the tab in the URL: choosing a tab pushes ?tab=, and the URL picks the tab', async () => {
    seedRecords();
    renderPage();
    await screen.findByText('Hypertension, improving.');

    await userEvent.click(tab(/Visits/));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/patient/records?tab=visits'), { scroll: false });
  });

  it('lists every visit by month, collapsed to one line, with a doctor filter and Expand all', async () => {
    seedRecords();
    searchParams = new URLSearchParams('tab=visits');
    renderPage();

    expect(await screen.findByRole('heading', { level: 3, name: 'August 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'July 2026' })).toBeInTheDocument();
    const toggles = screen.getAllByRole('button', { name: 'Read full note' });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Morning headaches.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByText('Morning headaches.')).toBeInTheDocument();
    expect(screen.getByText('Itchy forearms.')).toBeInTheDocument();
    expect(screen.getAllByText('Assessment')).toHaveLength(2);

    await userEvent.selectOptions(screen.getByLabelText('Doctor'), 'Dr. Salma Adel');
    expect(recordIds(activePanel())).toEqual(['visit-old']);
  });

  it('opens the tab and the note a ?highlight= link points at', async () => {
    seedRecords();
    searchParams = new URLSearchParams('highlight=visit-old');
    renderPage();

    expect(await screen.findByText('Itchy forearms.')).toBeInTheDocument();
    expect(tab(/Visits/)).toHaveAttribute('aria-selected', 'true');
  });

  it('shows conditions as one list by recorded date (the record has no active/resolved status)', async () => {
    seedRecords();
    searchParams = new URLSearchParams('tab=conditions');
    renderPage();

    const list = await screen.findByRole('heading', { name: /Conditions on record/ });
    expect(list).toBeInTheDocument();
    expect(recordIds(activePanel())).toEqual(['condition-1', 'condition-2']);
    expect(within(activePanel()).getByText(/Recorded Jul 2, 2026/)).toBeInTheDocument();
  });

  it('shows lab and imaging results from the health graph, each in its own card', async () => {
    seedRecords();
    searchParams = new URLSearchParams('tab=results');
    renderPage();

    expect(await screen.findByText('HbA1c 5.6%')).toBeInTheDocument();
    expect(screen.getByText('Chest X-ray: clear lungs')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lab results' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Imaging' })).toBeInTheDocument();
  });

  it('adds an uploaded document to the list without a reload', async () => {
    searchParams = new URLSearchParams('tab=documents');
    renderPage();

    expect(await screen.findByText('Uploaded documents will appear here.')).toBeInTheDocument();
    const input = activePanel().querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['%PDF'], 'blood-test.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('Uploaded. It is in your documents.')).toBeInTheDocument();
    expect(await within(activePanel()).findByText('Medical document')).toBeInTheDocument();
    expect(tab(/Documents/)).toHaveAttribute('data-count', '1');
  });

  it('refuses a file type the upload does not accept, before uploading', async () => {
    searchParams = new URLSearchParams('tab=documents');
    renderPage();
    await screen.findByText('Uploaded documents will appear here.');

    const input = activePanel().querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'notes.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), {
      applyAccept: false,
    });
    expect(await screen.findByText("This file type isn't accepted. Use a PDF, JPG or PNG.")).toBeInTheDocument();
  });

  it('shows the identity-verification gate when an unverified patient tries to upload', async () => {
    setPatientVerified(false);
    searchParams = new URLSearchParams('tab=documents');
    renderPage();
    await screen.findByText('Uploaded documents will appear here.');

    const input = activePanel().querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['%PDF'], 'report.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Verify your identity to upload documents')).toBeInTheDocument();
  });
});
