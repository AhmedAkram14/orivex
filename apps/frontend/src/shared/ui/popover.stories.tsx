import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta: Meta = { title: 'UI/Popover' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filters</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm text-text-primary">Filter by status, date range, or assigned doctor.</p>
      </PopoverContent>
    </Popover>
  ),
};
