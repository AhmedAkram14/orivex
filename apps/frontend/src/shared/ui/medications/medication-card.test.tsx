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
        frequencyLabel="Twice daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jul 1, 2026"
        status="active"
        statusLabel="Active"
      />,
    );

    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('500mg', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Ahmed', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders instructions when provided', () => {
    renderWithProviders(
      <MedicationCard
        medicationName="Metformin"
        dosageAmount="500mg"
        frequencyLabel="Twice daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jul 1, 2026"
        status="active"
        statusLabel="Active"
        instructions="Take with food."
      />,
    );

    expect(screen.getByText('Take with food.')).toBeInTheDocument();
  });

  it('omits instructions when not provided', () => {
    renderWithProviders(
      <MedicationCard
        medicationName="Lisinopril"
        dosageAmount="10mg"
        frequencyLabel="Once daily"
        prescribedBy="Dr. Sarah Ahmed"
        prescribedAtLabel="Jun 15, 2026"
        status="expired"
        statusLabel="Expired"
      />,
    );

    expect(screen.queryByText('Take with food.')).not.toBeInTheDocument();
  });
});
