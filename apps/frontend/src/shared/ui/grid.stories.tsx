import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './grid';

const meta: Meta<typeof Grid> = { title: 'UI/Grid', component: Grid };
export default meta;

export const ResponsiveThreeColumn: StoryObj = {
  render: () => (
    <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap="md">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-md border border-border-default bg-surface p-4 text-sm">
          Item {i + 1}
        </div>
      ))}
    </Grid>
  ),
};
