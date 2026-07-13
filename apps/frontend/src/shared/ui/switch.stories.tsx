import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';

const meta: Meta<typeof Switch> = { title: 'UI/Switch', component: Switch };
export default meta;

export const AllStates: StoryObj = {
  render: () => (
    <div className="flex items-center gap-6">
      <Switch />
      <Switch defaultChecked />
      <Switch disabled />
      <Switch disabled defaultChecked />
    </div>
  ),
};
