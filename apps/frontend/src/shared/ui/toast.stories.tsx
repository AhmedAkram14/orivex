import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import { Toast, ToastClose, ToastDescription, ToastTitle } from './toast';

const meta: Meta = { title: 'UI/Toast' };
export default meta;

export const Default: StoryObj = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Show toast</Button>
        <Toast open={open} onOpenChange={setOpen} variant="success">
          <div className="flex flex-col gap-1">
            <ToastTitle>Saved</ToastTitle>
            <ToastDescription>The clinical note was saved successfully.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      </>
    );
  },
};
