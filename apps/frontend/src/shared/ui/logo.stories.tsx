import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './logo';

const meta: Meta<typeof Logo> = { title: 'UI/Logo', component: Logo };
export default meta;

export const Sizes: StoryObj = {
  render: () => (
    <div className="flex items-end gap-6">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
      <Logo size="xl" />
    </div>
  ),
};
