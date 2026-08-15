import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { PATIENT_PATHS } from '@/features/patient/api/paths';
import { env } from '@/shared/lib/env';
import { server } from '@/mocks/server';
import { bookAppointment, getAppointmentById, resetPatientStore } from '@/mocks/patient-store';
import { resetSchedulingStore } from '@/mocks/scheduling-store';

import { CancelAction } from './cancel-action';

const DOCTOR_ID = 'doctor-profile-1';

/** Seeds a real, cancel-eligible (Requested) appointment via the same mock booking path `RescheduleAction`'s own tests use -- never a fabricated Appointment literal. */
function seedCancellableAppointment() {
  return bookAppointment({ doctorId: DOCTOR_ID, availabilityWindowId: `${DOCTOR_ID}::2026-01-05T10:00:00.000Z` });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSchedulingStore();
  resetPatientStore();
});
afterAll(() => server.close());

describe('CancelAction', () => {
  it('opens a confirm dialog with the generic copy for a Free appointment and does not call the mutation until confirmed', async () => {
    const appointment = seedCancellableAppointment();
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('heading', { name: 'Cancel appointment' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to cancel this appointment?')).toBeInTheDocument();

    // The appointment is untouched until the destructive action is actually confirmed.
    expect(getAppointmentById(appointment.id)?.status).toBe('requested');
  });

  it('shows the honest refund copy when cancelling would trigger a real refund', async () => {
    const appointment = seedCancellableAppointment();
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={true} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByText('This will cancel your appointment and refund your payment automatically.'),
    ).toBeInTheDocument();
  });

  it('calls the real cancel endpoint on confirm and moves the appointment to Cancelled', async () => {
    const appointment = seedCancellableAppointment();
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: 'Cancel appointment' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    await waitFor(() => {
      expect(getAppointmentById(appointment.id)?.status).toBe('cancelled');
    });
    // The dialog closes on success.
    expect(screen.queryByText('Are you sure you want to cancel this appointment?')).not.toBeInTheDocument();
  });

  it('closing the dialog without confirming never cancels the appointment', async () => {
    const appointment = seedCancellableAppointment();
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: 'Cancel appointment' });
    await userEvent.click(screen.getByRole('button', { name: 'Keep appointment' }));

    expect(screen.queryByRole('heading', { name: 'Cancel appointment' })).not.toBeInTheDocument();
    expect(getAppointmentById(appointment.id)?.status).toBe('requested');
  });

  // Real 404 -- unreachable in normal UI (the button only ever shows on the
  // caller's own appointment), but the API call could still 404; must still
  // show a real, distinct message rather than crashing or silently failing.
  it('shows a distinct real error when the appointment cannot be found', async () => {
    const appointment = seedCancellableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'test', timestamp: new Date().toISOString() } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: 'Cancel appointment' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    expect(
      await screen.findByText('This appointment could not be found. It may have already been changed elsewhere.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel appointment' })).not.toBeInTheDocument();
  });

  // The real domain-invalid-state error (422) -- e.g. the appointment was
  // already cancelled or completed in another tab between opening this
  // dialog and confirming.
  it('shows a distinct real error when the appointment can no longer be cancelled from its current state', async () => {
    const appointment = seedCancellableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'cannot be cancelled from its current status',
              requestId: 'test',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: 'Cancel appointment' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    expect(
      await screen.findByText('This appointment can no longer be cancelled — it may have already been changed elsewhere.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  // A real transient failure (network/5xx) -- distinct from the terminal
  // 404/422 states above: retrying is reasonable, so the Keep/Confirm
  // buttons stay available rather than being replaced by a single "Close".
  it('shows a generic error and keeps the confirm action retryable on a server error', async () => {
    const appointment = seedCancellableAppointment();
    server.use(
      http.patch(`${env.apiBaseUrl}${PATIENT_PATHS.appointment(appointment.id)}`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', requestId: 'test', timestamp: new Date().toISOString() } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<CancelAction appointmentId={appointment.id} willRefund={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: 'Cancel appointment' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel appointment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep appointment' })).toBeInTheDocument();
  });
});
