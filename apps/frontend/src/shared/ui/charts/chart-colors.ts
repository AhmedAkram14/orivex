/**
 * Fixed-order categorical palette for every chart in this app — reuses the
 * design system's own theme-aware CSS custom properties (design-system/
 * tokens/colors.css) rather than introducing new hardcoded hex values.
 * Assigned by position, never cycled/generated: a series always gets the
 * same color regardless of how many other series are present.
 */
export const CHART_SERIES_COLORS = [
  'var(--color-primary)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
] as const;

export const CHART_GRID_COLOR = 'var(--color-border-default)';
export const CHART_AXIS_COLOR = 'var(--color-text-tertiary)';
