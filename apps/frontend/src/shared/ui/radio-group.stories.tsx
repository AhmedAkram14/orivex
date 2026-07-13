import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';

const meta: Meta = { title: 'UI/RadioGroup' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <RadioGroup defaultValue="email" className="flex flex-col gap-3">
      <label className="flex items-center gap-2">
        <RadioGroupItem value="email" /> Email
      </label>
      <label className="flex items-center gap-2">
        <RadioGroupItem value="sms" /> SMS
      </label>
      <label className="flex items-center gap-2">
        <RadioGroupItem value="whatsapp" disabled /> WhatsApp (unavailable)
      </label>
    </RadioGroup>
  ),
};
