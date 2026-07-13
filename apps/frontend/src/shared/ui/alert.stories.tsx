import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './alert';

const meta: Meta<typeof Alert> = { title: 'UI/Alert', component: Alert };
export default meta;

export const AllVariants: StoryObj = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Alert variant="info" title="Heads up">This is an informational message.</Alert>
      <Alert variant="success" title="Saved">Your changes were saved successfully.</Alert>
      <Alert variant="warning" title="Unacknowledged suggestion">
        A Warning-tier AI suggestion has not been acknowledged yet.
      </Alert>
      <Alert variant="danger" title="Request failed">Something went wrong. Please try again.</Alert>
    </div>
  ),
};
