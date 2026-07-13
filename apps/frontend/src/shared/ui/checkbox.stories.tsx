import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';

const meta: Meta<typeof Checkbox> = { title: 'UI/Checkbox', component: Checkbox };
export default meta;

export const AllStates: StoryObj = {
  render: () => (
    <div className="flex items-center gap-6">
      <Checkbox />
      <Checkbox defaultChecked />
      <Checkbox disabled />
      <Checkbox disabled defaultChecked />
    </div>
  ),
};
