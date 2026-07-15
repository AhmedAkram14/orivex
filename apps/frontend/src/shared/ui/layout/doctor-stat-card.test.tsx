import { screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { DoctorStatCard } from './doctor-stat-card';

describe('DoctorStatCard', () => {
  it('shows a loading skeleton instead of the value when loading', () => {
    renderWithProviders(<DoctorStatCard icon={Users} label="Patients in queue" value="3" loading />);
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    renderWithProviders(<DoctorStatCard icon={Users} label="Patients in queue" value="3" href="/doctor/queue" />);
    expect(screen.getByRole('link', { name: /3/ })).toHaveAttribute('href', '/en/doctor/queue');
  });

  it('renders as a static tile when href is omitted', () => {
    renderWithProviders(<DoctorStatCard icon={Users} label="Patients in queue" value="3" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
