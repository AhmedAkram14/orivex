import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineCard } from './timeline-card';

describe('TimelineCard', () => {
  it('renders the time, title, and description', () => {
    render(<TimelineCard time="9:30 AM" title="Consultation" description="Follow-up visit" />);
    expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('Follow-up visit')).toBeInTheDocument();
  });

  it('renders the status badge only when both status and statusLabel are given', () => {
    const { rerender } = render(<TimelineCard time="9:30 AM" title="Consultation" />);
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();

    rerender(<TimelineCard time="9:30 AM" title="Consultation" status="upcoming" statusLabel="Upcoming" />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });
});
