import type { Meta, StoryObj } from '@storybook/react';
import { Users } from 'lucide-react';
import { DoctorStatCard } from './doctor-stat-card';

const meta: Meta<typeof DoctorStatCard> = {
  title: 'UI/Layout/DoctorStatCard',
  component: DoctorStatCard,
};
export default meta;

type Story = StoryObj<typeof DoctorStatCard>;

export const Default: Story = { args: { icon: Users, label: 'Patients in queue', value: '3' } };
export const Linked: Story = { args: { icon: Users, label: 'Patients in queue', value: '3', href: '#' } };
export const Loading: Story = { args: { icon: Users, label: 'Patients in queue', value: '3', loading: true } };
