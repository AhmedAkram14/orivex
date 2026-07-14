import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/shared/ui/button';
import { PageActions, PageHeader } from './page-header';

const meta: Meta<typeof PageHeader> = {
  title: 'UI/Layout/PageHeader',
  component: PageHeader,
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    description: "Welcome back, Dr. Sarah Ahmed.",
  },
};

export const WithActions: Story = {
  args: {
    title: 'Patients',
    description: 'Manage patient records.',
    actions: (
      <PageActions>
        <Button variant="outline">Export</Button>
        <Button>Add patient</Button>
      </PageActions>
    ),
  },
};
