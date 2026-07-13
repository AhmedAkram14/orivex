import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

const meta: Meta = { title: 'UI/Accordion' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="allergies">
        <AccordionTrigger>Allergies</AccordionTrigger>
        <AccordionContent>Penicillin (severe), Peanuts (mild).</AccordionContent>
      </AccordionItem>
      <AccordionItem value="vitals">
        <AccordionTrigger>Latest Vitals</AccordionTrigger>
        <AccordionContent>BP 120/80, HR 72 bpm, recorded 2 days ago.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
