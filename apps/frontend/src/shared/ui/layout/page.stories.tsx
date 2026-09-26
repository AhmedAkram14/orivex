import type { Meta, StoryObj } from '@storybook/react';
import { MetricStat } from '../metric-stat';
import { Stethoscope, Users } from 'lucide-react';
import { DashboardGrid, Page } from './page';
import { PageHeader } from './page-header';

const meta: Meta = { title: 'UI/Layout/Page' };
export default meta;

export const PageWithGrid: StoryObj = {
  render: () => (
    <Page>
      <PageHeader title="Dashboard" description="Today's overview" />
      <DashboardGrid columns={3}>
        <MetricStat icon={Stethoscope} label="Active doctors" value="8" />
        <MetricStat icon={Users} label="Active patients" value="312" />
        <MetricStat icon={Users} label="New this week" value="14" />
      </DashboardGrid>
    </Page>
  ),
};

export const TwoColumnGrid: StoryObj = {
  render: () => (
    <DashboardGrid columns={2}>
      <MetricStat icon={Stethoscope} label="Active doctors" value="8" />
      <MetricStat icon={Users} label="Active patients" value="312" />
    </DashboardGrid>
  ),
};
