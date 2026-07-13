import type { Meta, StoryObj } from '@storybook/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const meta: Meta = { title: 'UI/Select' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Select defaultValue="cardiology">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a specialty" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cardiology">Cardiology</SelectItem>
        <SelectItem value="dermatology">Dermatology</SelectItem>
        <SelectItem value="pediatrics">Pediatrics</SelectItem>
        <SelectItem value="radiology" disabled>Radiology (unavailable)</SelectItem>
      </SelectContent>
    </Select>
  ),
};
