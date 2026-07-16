import type { Meta, StoryObj } from '@storybook/react';
import { LoadingCalendar } from './loading-calendar';

const meta: Meta<typeof LoadingCalendar> = {
  title: 'UI/Schedule/LoadingCalendar',
  component: LoadingCalendar,
};
export default meta;

type Story = StoryObj<typeof LoadingCalendar>;

export const Default: Story = {};
