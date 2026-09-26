import type { Meta, StoryObj } from '@storybook/react';
import { EmptyWorkspace } from './empty-workspace';

const meta: Meta<typeof EmptyWorkspace> = {
  title: 'UI/Layout/EmptyWorkspace',
  component: EmptyWorkspace,
};
export default meta;

type Story = StoryObj<typeof EmptyWorkspace>;

export const Default: Story = {
  args: {
    title: 'Nothing here yet',
    description: 'This workspace pane will be available once its module is built.',
  },
};
