import type { Meta, StoryObj } from '@storybook/react';
import { LayoutDashboard, Users } from 'lucide-react';
import { NavGroup, NavItem } from './nav-item';

const meta: Meta = { title: 'UI/Layout/NavItem' };
export default meta;

export const Inactive: StoryObj = {
  render: () => <NavItem label="Dashboard" icon={LayoutDashboard} href="#" />,
};

export const Active: StoryObj = {
  render: () => <NavItem label="Dashboard" icon={LayoutDashboard} href="#" active />,
};

export const CollapsedGroup: StoryObj = {
  render: () => (
    <NavGroup label="Clinical" icon={Users}>
      <NavItem label="Patients" icon={Users} href="#" />
      <NavItem label="Appointments" icon={Users} href="#" />
    </NavGroup>
  ),
};

export const ExpandedGroup: StoryObj = {
  render: () => (
    <NavGroup label="Clinical" icon={Users} defaultOpen>
      <NavItem label="Patients" icon={Users} href="#" active />
      <NavItem label="Appointments" icon={Users} href="#" />
    </NavGroup>
  ),
};
