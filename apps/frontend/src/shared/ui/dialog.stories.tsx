import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta: Meta = { title: 'UI/Dialog' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Cancel appointment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>This action cannot be undone. The slot will be released.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Keep appointment</Button>
          <Button variant="danger">Cancel appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
