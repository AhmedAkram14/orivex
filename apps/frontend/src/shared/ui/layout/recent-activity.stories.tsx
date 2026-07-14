import type { Meta, StoryObj } from '@storybook/react';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { ActivityCard } from './activity-card';
import { RecentActivityContainer } from './recent-activity';

const meta: Meta = { title: 'UI/Layout/RecentActivityContainer' };
export default meta;

export const WithItems: StoryObj = {
  render: () => (
    <RecentActivityContainer
      title="Recent activity"
      isEmpty={false}
      emptyTitle="Nothing yet"
      items={[
        <li key="1">
          <ActivityCard icon={UserPlus} title="New patient registered" timestamp="2h ago" />
        </li>,
        <li key="2">
          <ActivityCard icon={LogIn} title="New device signed in" timestamp="1d ago" />
        </li>,
        <li key="3">
          <ActivityCard icon={KeyRound} title="Password changed" timestamp="5d ago" />
        </li>,
      ]}
    />
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <RecentActivityContainer
      title="Recent activity"
      isEmpty
      items={[]}
      emptyTitle="Nothing to show yet"
      emptyDescription="Activity will appear here once something happens."
    />
  ),
};
