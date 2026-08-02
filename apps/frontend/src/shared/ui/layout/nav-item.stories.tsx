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

export const Group: StoryObj = {
  render: () => (
    <NavGroup label="Clinical">
      <NavItem label="Patients" icon={Users} href="#" active />
      <NavItem label="Appointments" icon={Users} href="#" />
    </NavGroup>
  ),
};
