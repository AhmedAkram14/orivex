import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { server } from '@/mocks/server';
import { resetMessagingStore, startOrGetThread, sendMessage } from '@/mocks/messaging-store';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
});
afterAll(() => server.close());

function renderSidebar(state: AuthState) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AuthContext.Provider value={state}>
          <SidebarNav />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const patientState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'patient@orivex.dev', fullName: 'Jane Patient', roles: ['patient'] },
};

const superAdminState: AuthState = {
  status: 'authenticated',
  user: { id: '2', email: 'admin@orivex.dev', fullName: 'Ada Admin', roles: ['super_admin'] },
};

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '3', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

describe('SidebarNav', () => {
  it('always shows Security, the one unrestricted destination outside a workspace group', () => {
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument();
  });

  it('never shows a top-level Dashboard item -- each workspace group\'s own Overview is the one real home link, no duplicate destination', () => {
    renderSidebar(patientState);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('hides the still-feature-flag-gated Clinical group for every role, since its flags default off', () => {
    renderSidebar(superAdminState);
    expect(screen.queryByText('Clinical')).not.toBeInTheDocument();
  });

  it('shows the Administration group for a super_admin now that nav.adminUsers (Stage 4) defaults on', () => {
    renderSidebar(superAdminState);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('shows the new Admin Workspace group for a super_admin', () => {
    renderSidebar(superAdminState);
    expect(screen.getByText('Admin Workspace')).toBeInTheDocument();
  });

  it('hides the Admin Workspace group for a patient', () => {
    renderSidebar(patientState);
    expect(screen.queryByText('Admin Workspace')).not.toBeInTheDocument();
  });

  it('marks the item matching the current route as active', () => {
    mockPathname = '/security';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks only the specific matching item active, never the workspace root too, on a nested route', () => {
    mockPathname = '/patient/doctors';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Browse Doctors' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('marks the workspace root Overview active when genuinely on that exact route', () => {
    mockPathname = '/patient';
    renderSidebar(patientState);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the new Patients/Reports/Settings doctor-workspace links for a doctor', () => {
    renderSidebar(doctorState);
    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', expect.stringContaining('/doctor/patients'));
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', expect.stringContaining('/doctor/reports'));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', expect.stringContaining('/doctor/settings'));
  });

  // Messages Page Overhaul (Phase 3): the unread-message badge next to the
  // Messages nav entry. `resolveRequestAccountId` falls back to
  // `LEGACY_PATIENT_ACCOUNT_ID` when no bearer token/session marker exists
  // (no login flow ran in this test) -- independent of this test's own
  // `AuthContext` value, which only drives which nav items render.
  it('shows no unread badge next to Messages when the resolved account has no unread messages', async () => {
    renderSidebar(patientState);
    await screen.findByRole('link', { name: 'Messages' });
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows the live unread count next to Messages once the resolved account has an unread message', async () => {
    const thread = startOrGetThread(LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID);
    sendMessage(thread.id, LEGACY_DOCTOR_ACCOUNT_ID, 'Please see the attached labs.');

    renderSidebar(patientState);

    expect(await screen.findByText('1')).toBeInTheDocument();
  });
});
