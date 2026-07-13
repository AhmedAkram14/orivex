import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const meta: Meta = { title: 'UI/Tooltip' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Acknowledge this suggestion before signing.</TooltipContent>
    </Tooltip>
  ),
};
