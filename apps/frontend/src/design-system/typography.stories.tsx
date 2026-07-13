import type { Meta, StoryObj } from '@storybook/react';
import { Caption, Code, Display, Heading, Text } from './typography';

const meta: Meta = {
  title: 'Design System/Typography',
};
export default meta;

export const AllPrimitives: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Display>Display text</Display>
      <Heading level={1}>Heading level 1</Heading>
      <Heading level={2}>Heading level 2</Heading>
      <Heading level={3}>Heading level 3</Heading>
      <Heading level={4}>Heading level 4</Heading>
      <Text size="lg">Body text — large</Text>
      <Text>Body text — base</Text>
      <Text size="sm" tone="secondary">Body text — small, secondary tone</Text>
      <Caption>Caption text</Caption>
      <Code>const example = &apos;code&apos;;</Code>
    </div>
  ),
};

export const Arabic: StoryObj = {
  render: () => (
    <div lang="ar" dir="rtl" className="flex flex-col gap-4">
      <Heading level={1}>عنوان الصفحة</Heading>
      <Text>هذا نص تجريبي باللغة العربية للتحقق من الخط والاتجاه.</Text>
    </div>
  ),
};
