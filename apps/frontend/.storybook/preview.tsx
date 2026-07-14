import type { Preview } from '@storybook/react';
import React from 'react';

import { AppProviders } from '../src/shared/providers/app-providers';

import '../src/app/globals.css';

/**
 * Global toolbar controls for direction and theme, since Phase 1's
 * Definition of Done requires every component to be verifiable in both
 * directions (LTR/RTL) and both themes (light/dark) — not just the
 * default. These map directly onto the same `dir` attribute and
 * `data-theme` attribute Phase 3 (i18n) and Phase 24 (Dark Mode) will set
 * for real; Storybook does not invent a parallel mechanism.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
    backgrounds: { disable: true },
  },
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
        ],
      },
    },
    theme: {
      name: 'Theme',
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const direction = context.globals.direction ?? 'ltr';
      const theme = context.globals.theme ?? 'light';
      return (
        <div dir={direction} data-theme={theme} className="bg-canvas p-6 text-text-primary">
          <AppProviders>
            <Story />
          </AppProviders>
        </div>
      );
    },
  ],
};

export default preview;
