import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './logo';

const meta: Meta<typeof Logo> = { title: 'UI/Logo', component: Logo };
export default meta;

export const Sizes: StoryObj = {
  render: () => (
    <div className="flex items-end gap-6 text-primary">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
      <Logo size="xl" />
    </div>
  ),
};

export const OnPaperAndOnDark: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <div className="flex items-center justify-center rounded-md bg-white p-8 text-neutral-900">
        <Logo size="lg" />
      </div>
      <div className="flex items-center justify-center rounded-md bg-neutral-900 p-8 text-white">
        <Logo size="lg" />
      </div>
    </div>
  ),
};
