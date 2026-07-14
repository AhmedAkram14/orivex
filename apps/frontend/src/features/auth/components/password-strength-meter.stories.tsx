import type { Meta, StoryObj } from '@storybook/react';
import { PasswordStrengthMeter } from './password-strength-meter';

const meta: Meta<typeof PasswordStrengthMeter> = {
  title: 'Auth/PasswordStrengthMeter',
  component: PasswordStrengthMeter,
};
export default meta;

type Story = StoryObj<typeof PasswordStrengthMeter>;

export const VeryWeak: Story = { args: { password: 'abc' } };
export const Weak: Story = { args: { password: 'abcdefgh' } };
export const Fair: Story = { args: { password: 'abcdefghABCD' } };
export const Strong: Story = { args: { password: 'abcdefgh1234' } };
export const VeryStrong: Story = { args: { password: 'Str0ng!Passw0rd' } };
export const Empty: Story = { args: { password: '' } };
