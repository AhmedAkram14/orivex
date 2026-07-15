import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrentPatientCard } from './current-patient-card';

describe('CurrentPatientCard', () => {
  it('shows the empty state when no content is given', () => {
    render(<CurrentPatientCard title="Current patient" emptyTitle="No one in consultation" />);
    expect(screen.getByText('No one in consultation')).toBeInTheDocument();
  });

  it('renders the provided content instead of the empty state', () => {
    render(
      <CurrentPatientCard title="Current patient" emptyTitle="No one in consultation" content={<p>Patient #1</p>} />,
    );
    expect(screen.getByText('Patient #1')).toBeInTheDocument();
    expect(screen.queryByText('No one in consultation')).not.toBeInTheDocument();
  });
});
