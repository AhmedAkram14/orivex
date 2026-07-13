import type { Meta, StoryObj } from '@storybook/react';
import { Container } from './container';

const meta: Meta<typeof Container> = { title: 'UI/Container', component: Container };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Container size="md" className="border border-dashed border-border-strong py-4">
      Centered, max-width content.
    </Container>
  ),
};
