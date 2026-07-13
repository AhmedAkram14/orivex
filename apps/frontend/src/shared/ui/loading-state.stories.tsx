import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState } from './loading-state';

const meta: Meta<typeof LoadingState> = { title: 'UI/LoadingState', component: LoadingState };
export default meta;

export const Default: StoryObj = { args: { label: 'Loading patient records' } };
