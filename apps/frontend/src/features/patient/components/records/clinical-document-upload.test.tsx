import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { server } from '@/mocks/server';
import { setPatientVerified } from '@/mocks/patient-store';

import { ClinicalDocumentUpload } from './clinical-document-upload';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ClinicalDocumentUpload', () => {
  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // backend gate (RequiresIdentityVerificationGuard on the clinical_attachment
  // media-asset purpose) -- exercised end to end via the real
  // upload-intent handler in `mocks/handlers/media-assets.ts`.
  it('shows the identity-verification gate instead of uploading when the patient is unverified', async () => {
    setPatientVerified(false);
    renderWithProviders(<ClinicalDocumentUpload />);

    const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(await screen.findByText('Verify your identity to upload documents')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start verification' })).toBeInTheDocument();
  });

  it('uploads normally once the patient is already verified', async () => {
    setPatientVerified(true);
    renderWithProviders(<ClinicalDocumentUpload />);

    const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
  });
});
