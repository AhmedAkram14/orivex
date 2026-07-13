import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = { title: 'UI/Input', component: Input };
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'you@example.com' } };
export const Invalid: Story = {
  args: { placeholder: 'you@example.com', 'aria-invalid': true, defaultValue: 'not-an-email' },
};
export const Disabled: Story = { args: { placeholder: 'Disabled', disabled: true } };
