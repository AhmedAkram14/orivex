import type { StorybookConfig } from '@storybook/experimental-nextjs-vite';

/**
 * Uses the Vite-based Next.js framework rather than @storybook/nextjs
 * (webpack-based) — the webpack builder merges Next.js's internally
 * vendored webpack copy (next/dist/compiled/webpack) with Storybook's own
 * separately-installed `webpack` package, and a plugin instance created via
 * one ends up hooked by the other, causing a hard "different Compilation
 * class" crash that no version pin or pnpm override can fix (Next's copy
 * isn't a resolvable dependency at all). The Vite builder sidesteps this
 * entirely by not touching Next's webpack config.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/experimental-nextjs-vite',
    options: {},
  },
  staticDirs: [],
};

export default config;
