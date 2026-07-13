import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Uses the plain React/Vite framework, not either Next.js-specific
 * Storybook integration. Both were tried and both fail against current
 * Next.js:
 *  - `@storybook/nextjs` (webpack): merges Next's internally-vendored
 *    webpack copy (next/dist/compiled/webpack) with Storybook's own
 *    separately-installed `webpack` package; a plugin instance created via
 *    one ends up hooked by the other, causing a hard "different
 *    Compilation class" crash no version pin or pnpm override can fix.
 *  - `@storybook/experimental-nextjs-vite`: its bundled
 *    `vite-plugin-storybook-nextjs` dependency `require()`s a specific
 *    internal Next.js file path (next/dist/build/webpack/plugins/
 *    define-env-plugin.js) that moved between Next 15.1.x and 15.5.x —
 *    an unstable internal path, not a public API, so it breaks across
 *    Next minor versions.
 * Neither of Storybook 8.x's Next integrations is usable against current
 * Next.js releases. None of our components import `next/image`,
 * `next/font`, `next/navigation`, or `next/link` (verified), so the
 * plain framework needs no Next-specific shims to render them correctly.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [],
  // The Next-specific framework auto-wired the `@/*` tsconfig path alias;
  // the plain framework doesn't, so it's added explicitly here, mirroring
  // vitest.config.ts's identical alias.
  async viteFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    };
    return config;
  },
};

export default config;
