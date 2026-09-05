import { screen } from '@testing-library/react';
import { Scale } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { VitalTrendCard } from './vital-trend-card';

describe('VitalTrendCard', () => {
  it('renders the latest value, date, and trend chart when readings exist', () => {
    renderWithProviders(
      <VitalTrendCard
        icon={Scale}
        title="Weight"
        latestValueLabel="74 kg"
        latestDateLabel="Jul 10, 2026"
        trendValues={[68, 70, 74]}
        trendLabel="Weight rising from 68 to 74 kg"
        emptyTitle="No weight readings yet"
        emptyDescription="Your weight readings will appear here once recorded."
      />,
    );

    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('74 kg')).toBeInTheDocument();
    expect(screen.getByText('Jul 10, 2026')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Weight rising from 68 to 74 kg' })).toBeInTheDocument();
  });

  it('shows an honest empty state when no readings exist', () => {
    renderWithProviders(
      <VitalTrendCard
        icon={Scale}
        title="Weight"
        trendValues={[]}
        trendLabel="No readings"
        emptyTitle="No weight readings yet"
        emptyDescription="Your weight readings will appear here once recorded."
      />,
    );

    expect(screen.getByText('No weight readings yet')).toBeInTheDocument();
  });

  it('applies the given accent color to the icon circle', () => {
    const { container } = renderWithProviders(
      <VitalTrendCard
        icon={Scale}
        title="Weight"
        accentClassName="bg-info-subtle text-info-emphasis"
        trendValues={[68, 70, 74]}
        latestValueLabel="74 kg"
        trendLabel="Weight rising from 68 to 74 kg"
        emptyTitle="No weight readings yet"
        emptyDescription="Your weight readings will appear here once recorded."
      />,
    );

    expect(container.querySelector('.bg-info-subtle')).toBeInTheDocument();
  });
});
