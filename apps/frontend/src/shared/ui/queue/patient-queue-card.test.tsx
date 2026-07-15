import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientQueueCard } from './patient-queue-card';

describe('PatientQueueCard', () => {
  it('renders position, label, and status', () => {
    render(<PatientQueueCard position={2} label="Patient #2" status="waiting" statusLabel="Waiting" />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Patient #2')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });

  it('renders the estimated wait time only when provided', () => {
    const { rerender } = render(
      <PatientQueueCard position={1} label="Patient #1" status="waiting" statusLabel="Waiting" waitTimeLabel="~10 min" />,
    );
    expect(screen.getByText('~10 min')).toBeInTheDocument();

    rerender(<PatientQueueCard position={1} label="Patient #1" status="waiting" statusLabel="Waiting" />);
    expect(screen.queryByText('~10 min')).not.toBeInTheDocument();
  });
});
