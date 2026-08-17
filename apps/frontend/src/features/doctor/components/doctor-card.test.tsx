import { screen, waitFor } from '@testing-library/react';
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
    expect(image).toHaveAttribute('alt', 'Dr. Omar Hassan');
  });

  it('falls back to initials when no avatarUrl is on record -- never a broken image, never a blank avatar', async () => {
    renderWithProviders(
      <DoctorCard doctorProfileId="doctor-2" fullName="Dr. Salma Adel" specialtyLabel="Psychiatry" ratingSlot={null} />,
    );

    // initialsOf() takes the first letter of the first two words -- "Dr."
    // counts as the first word, so this is "DS", not the person's own
    // initials "SA". That's an existing, pre-existing quirk of how doctor
    // names ("Dr. X Y") get abbreviated everywhere in this app, not
    // something this test invents.
    expect(await screen.findByText('DS')).toBeInTheDocument();
  });
});
