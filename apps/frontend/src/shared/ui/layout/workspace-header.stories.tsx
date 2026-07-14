import type { Meta, StoryObj } from '@storybook/react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { WorkspaceHeader } from './workspace-header';

const meta: Meta<typeof WorkspaceHeader> = {
  title: 'UI/Layout/WorkspaceHeader',
  component: WorkspaceHeader,
};
export default meta;

type Story = StoryObj<typeof WorkspaceHeader>;

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Billing',
    description: 'Manage invoices and payment history.',
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Administration</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Billing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
};

export const WithoutBreadcrumbs: Story = {
  args: {
    title: 'Dashboard',
    description: 'Welcome back.',
  },
};
