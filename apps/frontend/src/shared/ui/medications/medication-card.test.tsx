import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { MedicationCard } from './medication-card';

describe('MedicationCard', () => {
  it('renders the medication name, dosage, prescriber, and status', () => {
    renderWithProviders(
      <MedicationCard
        medicationName="Metformin"
        dosageAmount="500mg"
        dosesPerDay={2}
        frequencyLabel="Twice daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jul 1, 2026"
        status="active"
        statusLabel="Active"
        refillStatus="not-due"
        refillStatusLabel="Not due"
      />,
    );

    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('500mg', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('omits the refill badge unless explicitly shown', () => {
    renderWithProviders(
      <MedicationCard
        medicationName="Metformin"
        dosageAmount="500mg"
        dosesPerDay={2}
        frequencyLabel="Twice daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jul 1, 2026"
        status="active"
        statusLabel="Active"
        refillStatus="due"
        refillStatusLabel="Refill due"
      />,
    );

    expect(screen.queryByText('Refill due')).not.toBeInTheDocument();
  });

  it('shows the refill badge when requested', () => {
    renderWithProviders(
      <MedicationCard
        medicationName="Lisinopril"
        dosageAmount="10mg"
        dosesPerDay={1}
        frequencyLabel="Once daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jun 15, 2026"
        status="active"
        statusLabel="Active"
        refillStatus="due"
        refillStatusLabel="Refill due"
        showRefillBadge
      />,
    );

    expect(screen.getByText('Refill due')).toBeInTheDocument();
  });
});
