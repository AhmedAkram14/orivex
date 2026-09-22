import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { doctorApi } from '@/features/doctor/api/doctor-api';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { toast } from '@/shared/ui/use-toast';

import { ConsultationDefaultsForm } from './consultation-defaults-form';

vi.mock('@/features/doctor/api/doctor-api', () => ({
  doctorApi: { getProfile: vi.fn(), updateProfile: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

const PROFILE: DoctorProfile = {
  id: 'doctor-profile-1',
  accountId: 'acct-1',
  fullName: 'Dr. Sarah Ahmed',
  email: 'doctor@orivex.dev',
  licenseNumber: 'LIC-2010-4471',
  specialtyId: 'specialty-cardiology',
  languages: ['en'],
  insuranceProviders: [],
  publications: [],
  awards: [],
  workExperience: [],
  createdAt: '2020-01-15T00:00:00.000Z',
  updatedAt: '2020-01-15T00:00:00.000Z',
  maxFreeSlotsPerDay: 3,
  bufferMinutesOverride: 15,
  autoApproveFreeBookings: true,
};

describe('ConsultationDefaultsForm', () => {
  // `doctorApi.updateProfile` is a module-level mock shared across every
  // test below -- without this, its call history accumulates across tests,
  // and a later test's `.not.toHaveBeenCalled()`/call-args assertion would
  // see an earlier test's real call instead of its own.
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current values from the doctor profile', async () => {
    vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
    renderWithProviders(<ConsultationDefaultsForm />);

    expect(await screen.findByLabelText('Max free slots per day')).toHaveValue(3);
    expect(screen.getByLabelText('Buffer between appointments (minutes)')).toHaveValue(15);
    expect(screen.getByRole('checkbox', { name: /Auto-approve free bookings/ })).toHaveAttribute('data-state', 'checked');
  });

  it('enables Save only once a field actually changes', async () => {
    vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
    const user = userEvent.setup();
    renderWithProviders(<ConsultationDefaultsForm />);

    const maxFreeSlotsInput = await screen.findByLabelText('Max free slots per day');
    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    await user.clear(maxFreeSlotsInput);
    await user.type(maxFreeSlotsInput, '5');
    expect(saveButton).not.toBeDisabled();
  });

  it('submits the full form through the profile-update mutation and shows a success toast', async () => {
    vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
    vi.mocked(doctorApi.updateProfile).mockResolvedValue({ ...PROFILE, maxFreeSlotsPerDay: 5 });
    const user = userEvent.setup();
    renderWithProviders(<ConsultationDefaultsForm />);

    const maxFreeSlotsInput = await screen.findByLabelText('Max free slots per day');
    await user.clear(maxFreeSlotsInput);
    await user.type(maxFreeSlotsInput, '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(doctorApi.updateProfile).toHaveBeenCalledWith({
        maxFreeSlotsPerDay: 5,
        bufferMinutesOverride: 15,
        autoApproveFreeBookings: true,
      }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  });

  it('rejects a negative buffer override with a validation error, without submitting', async () => {
    vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
    const user = userEvent.setup();
    renderWithProviders(<ConsultationDefaultsForm />);

    const bufferInput = await screen.findByLabelText('Buffer between appointments (minutes)');
    // `userEvent.type` simulates real per-keystroke constraint validation on
    // a `type="number"` input, which jsdom applies inconsistently for a
    // leading "-" -- `fireEvent.change` sets the value directly, the same
    // way a real negative number would land after e.g. a paste.
    fireEvent.change(bufferInput, { target: { value: '-5' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a whole number of 0 or more.')).toBeInTheDocument();
    expect(doctorApi.updateProfile).not.toHaveBeenCalled();
  });

  it('shows an inline error alert when the save fails', async () => {
    vi.mocked(doctorApi.getProfile).mockResolvedValue(PROFILE);
    vi.mocked(doctorApi.updateProfile).mockRejectedValue(
      new ApiError(500, { code: 'internal_error', message: 'Update failed', requestId: 'req-1', timestamp: new Date().toISOString() }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConsultationDefaultsForm />);

    const maxFreeSlotsInput = await screen.findByLabelText('Max free slots per day');
    await user.clear(maxFreeSlotsInput);
    await user.type(maxFreeSlotsInput, '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Update failed');
  });
});
