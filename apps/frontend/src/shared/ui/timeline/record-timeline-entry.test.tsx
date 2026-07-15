import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { RecordTimelineEntry } from './record-timeline-entry';

describe('RecordTimelineEntry', () => {
  it('renders the title, type badge, date, and doctor', () => {
    renderWithProviders(
      <RecordTimelineEntry
        dateLabel="Jul 12, 2026"
        type="visit"
        typeLabel="Visit"
        title="Annual check-up"
        doctorName="Dr. Sarah Ahmed"
      />,
    );

    expect(screen.getByText('Annual check-up')).toBeInTheDocument();
    expect(screen.getByText('Visit')).toBeInTheDocument();
    expect(screen.getByText(/Jul 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Sarah Ahmed/)).toBeInTheDocument();
  });

  it('renders optional actions only when provided', () => {
    const { rerender } = renderWithProviders(
      <RecordTimelineEntry dateLabel="Jul 12, 2026" type="visit" typeLabel="Visit" title="Annual check-up" />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <RecordTimelineEntry
        dateLabel="Jul 12, 2026"
        type="visit"
        typeLabel="Visit"
        title="Annual check-up"
        actions={<button type="button">Download</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });
});
