import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The design system's own type scale (`design-system/tokens/typography.css`)
// is font-size utilities too: without telling tailwind-merge, `text-h1` looks
// like a text *colour* and gets silently dropped next to `text-text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'display-hero', 'h1', 'h2', 'h3', 'body', 'small', 'caption', 'metric', 'metric-xl'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
