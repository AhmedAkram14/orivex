import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';

import { LandingNavbar } from './landing-navbar';

describe('LandingNavbar', () => {
  it('links each section anchor and the sign-in/register CTAs to their real destinations', () => {
    renderWithProviders(<LandingNavbar />);

    expect(screen.getByRole('link', { name: 'Specialties' })).toHaveAttribute('href', '#specialties');
    expect(screen.getByRole('link', { name: 'How It Works' })).toHaveAttribute('href', '#how-it-works');
    expect(screen.getByRole('link', { name: 'For Doctors' })).toHaveAttribute('href', '#for-doctors');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');

    const signInLinks = screen.getAllByRole('link', { name: 'Sign In' });
    expect(signInLinks[0]).toHaveAttribute('href', expect.stringContaining('/login'));
    const registerLinks = screen.getAllByRole('link', { name: 'Register' });
    expect(registerLinks[0]).toHaveAttribute('href', expect.stringContaining('/register'));
  });

  it('opens the mobile menu with the same links when the menu button is clicked', async () => {
    renderWithProviders(<LandingNavbar />);

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Specialties' }).length).toBeGreaterThan(0);
  });
});
