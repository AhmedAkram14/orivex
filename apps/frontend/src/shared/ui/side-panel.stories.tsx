import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Drawer, Sheet } from './side-panel';

const meta: Meta = { title: 'UI/SidePanel' };
export default meta;

export const DrawerExample: StoryObj = {
  render: () => (
    <Drawer>
      <Drawer.Trigger asChild>
        <Button variant="outline">Open drawer</Button>
      </Drawer.Trigger>
      <Drawer.Content side="end">
        <Drawer.Header>
          <Drawer.Title className="text-lg font-semibold text-text-primary">Patient details</Drawer.Title>
          <Drawer.Description className="text-sm text-text-secondary">
            Read-only summary, scoped to what this doctor is authorized to view.
          </Drawer.Description>
        </Drawer.Header>
      </Drawer.Content>
    </Drawer>
  ),
};

export const SheetExample: StoryObj = {
  render: () => (
    <Sheet>
      <Sheet.Trigger asChild>
        <Button variant="outline">Open sheet</Button>
      </Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title className="text-lg font-semibold text-text-primary">Quick actions</Sheet.Title>
        </Sheet.Header>
      </Sheet.Content>
    </Sheet>
  ),
};
