import type { Meta, StoryObj } from '@storybook/react';
import { AppLoadingScreen } from './app-loading-screen';

const meta: Meta<typeof AppLoadingScreen> = { title: 'UI/AppLoadingScreen', component: AppLoadingScreen };
export default meta;

export const Default: StoryObj = {};
export const CustomMessage: StoryObj = { args: { message: 'Checking your session' } };
