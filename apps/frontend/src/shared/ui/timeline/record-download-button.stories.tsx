import type { Meta, StoryObj } from '@storybook/react';
import { RecordDownloadButton } from './record-download-button';

const meta: Meta<typeof RecordDownloadButton> = {
  title: 'UI/Timeline/RecordDownloadButton',
  component: RecordDownloadButton,
};
export default meta;

type Story = StoryObj<typeof RecordDownloadButton>;

export const Default: Story = { args: { href: '#', label: 'Download report' } };
