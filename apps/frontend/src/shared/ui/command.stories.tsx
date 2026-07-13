import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';

const meta: Meta = { title: 'UI/CommandPalette' };
export default meta;

export const Default: StoryObj = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open command palette
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Search patients, doctors, appointments…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Patients">
              <CommandItem>Ahmed Hassan</CommandItem>
              <CommandItem>Mona Youssef</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Doctors">
              <CommandItem>Dr. Sarah Ahmed — Cardiology</CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};
