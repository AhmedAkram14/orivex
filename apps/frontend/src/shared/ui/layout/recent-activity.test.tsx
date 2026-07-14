import { render, screen } from '@testing-library/react';
import { UserPlus } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ActivityCard } from './activity-card';
import { RecentActivityContainer } from './recent-activity';

describe('RecentActivityContainer', () => {
  it('shows the empty state when there are no items', () => {
    render(
      <RecentActivityContainer
        title="Recent activity"
        isEmpty
        items={[]}
        emptyTitle="Nothing yet"
        emptyDescription="Activity will appear here."
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('renders the provided items instead of the empty state when not empty', () => {
    render(
      <RecentActivityContainer
        title="Recent activity"
        isEmpty={false}
        items={[
          <li key="1">
            <ActivityCard icon={UserPlus} title="New patient registered" />
          </li>,
        ]}
        emptyTitle="Nothing yet"
      />,
    );
    expect(screen.getByText('New patient registered')).toBeInTheDocument();
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument();
  });
});
