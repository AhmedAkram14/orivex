import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthState } from '@/shared/auth/types';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { DoctorCard } from './doctor-card';

describe('DoctorCard avatar', () => {
  it('renders the real profile photo when avatarUrl is provided', async () => {
    const { container } = renderWithProviders(
      <DoctorCard
        doctorProfileId="doctor-1"
        fullName="Dr. Omar Hassan"
        avatarUrl="/demo/avatars/doctor-01.png"
        specialtyLabel="Psychiatry"
        ratingSlot={null}
      />,
    );

    await waitFor(() => expect(container.querySelector('img')).toBeInTheDocument());
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/demo/avatars/doctor-01.png');
    // Decorative: the name is rendered right beside it.
    expect(image).toHaveAttribute('alt', '');
  });

  it('falls back to initials when no avatarUrl is on record -- never a broken image, never a blank avatar', async () => {
    renderWithProviders(
      <DoctorCard doctorProfileId="doctor-2" fullName="Dr. Salma Adel" specialtyLabel="Psychiatry" ratingSlot={null} />,
    );

    // initialsOf() skips the "Dr." title, so this is the person's own initials.
    // counts as the first word, so this is "DS", not the person's own
    // initials "SA". That's an existing, pre-existing quirk of how doctor
    // names ("Dr. X Y") get abbreviated everywhere in this app, not
    // something this test invents.
    expect(await screen.findByText('SA')).toBeInTheDocument();
  });
});

function authAs(roles: string[]): AuthState {
  return { status: 'authenticated', user: { id: 'u1', email: 'x@orivex.dev', fullName: 'X', roles } } as AuthState;
}

function renderCard(authState?: AuthState) {
  return renderWithProviders(
    <DoctorCard doctorProfileId="doctor-9" fullName="Dr. Salma Adel" specialtyLabel="Psychiatry" ratingSlot={null} />,
    authState ? { authState } : undefined,
  );
}

describe('DoctorCard actions by viewer', () => {
  it('signed out: Book is live and goes to sign-in, returning to this doctor', () => {
    renderCard();
    const book = screen.getByRole('link', { name: /^Book$/ });
    const href = book.getAttribute('href') ?? '';
    expect(href).toContain('/login?returnTo=');
    expect(decodeURIComponent(href)).toContain('/patient/appointments/book?doctorId=doctor-9');
    expect(book).not.toHaveAttribute('aria-disabled');
  });

  it('a patient: Book goes straight to booking', () => {
    renderCard(authAs(['patient']));
    expect(screen.getByRole('link', { name: /^Book$/ })).toHaveAttribute('href', expect.stringContaining('/patient/appointments/book?doctorId=doctor-9'));
    expect(screen.getByRole('link', { name: /^Book$/ }).getAttribute('href')).not.toContain('/login');
  });

  it('a doctor: Book is shown unavailable with a one-line reason, and leads nowhere', async () => {
    renderCard(authAs(['doctor']));
    expect(screen.queryByRole('link', { name: /^Book/ })).not.toBeInTheDocument();
    const book = screen.getByRole('button', { name: /^Book/ });
    expect(book).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(book);
    expect((await screen.findAllByText('Only patient accounts can book appointments.')).length).toBeGreaterThan(0);
  });
});
