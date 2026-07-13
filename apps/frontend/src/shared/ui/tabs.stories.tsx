import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta: Meta = { title: 'UI/Tabs' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Tabs defaultValue="notes" className="w-full max-w-md">
      <TabsList>
        <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        <TabsTrigger value="labs" disabled>Lab Results</TabsTrigger>
      </TabsList>
      <TabsContent value="notes">Clinical notes content.</TabsContent>
      <TabsContent value="prescriptions">Prescription history content.</TabsContent>
    </Tabs>
  ),
};
