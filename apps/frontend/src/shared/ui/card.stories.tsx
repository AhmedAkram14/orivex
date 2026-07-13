import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

const meta: Meta<typeof Card> = { title: 'UI/Card', component: Card };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Appointment reminder</CardTitle>
        <CardDescription>You have a consultation scheduled for tomorrow at 10:00 AM.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">Dr. Sarah Ahmed — Cardiology</p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">Reschedule</Button>
        <Button size="sm">Confirm</Button>
      </CardFooter>
    </Card>
  ),
};
