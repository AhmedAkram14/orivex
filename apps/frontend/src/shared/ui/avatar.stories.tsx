import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage, AvatarPresenceDot } from './avatar';

const meta: Meta = { title: 'UI/Avatar' };
export default meta;

export const AllSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>
      <Avatar size="md">
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const WithImage: StoryObj = {
  render: () => (
    <Avatar size="lg">
      <AvatarImage src="https://i.pravatar.cc/150?img=12" alt="Dr. Sarah Ahmed" />
      <AvatarFallback>SA</AvatarFallback>
    </Avatar>
  ),
};

export const WithPresence: StoryObj = {
  render: () => (
    <div className="relative inline-flex">
      <Avatar size="lg">
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>
      <AvatarPresenceDot status="online" />
    </div>
  ),
};
