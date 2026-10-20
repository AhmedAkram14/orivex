/**
 * Fixed-order categorical palette for every chart in this app -- the
 * design system's `--color-chart-1..6` tokens (design-system/tokens), each a
 * distinct hue validated for colour-vision deficiency in both themes. The
 * previous set mixed three greys, so pie segments (gender, age) were hard to
 * tell apart. Assigned by position, never cycled/generated: a series always
 * gets the same color regardless of how many other series are present.
 */
export const CHART_SERIES_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
] as const;

/** Status colours are reserved for a value that is clinically evaluated (in range / out of range) -- never for series identity. */
export const CHART_STATUS_COLORS = {
  inRange: 'var(--color-success)',
  outOfRange: 'var(--color-warning)',
  critical: 'var(--color-danger)',
} as const;

/** Gridlines are ~8% ink: barely there, but enough to read values off. */
export const CHART_GRID_COLOR = 'color-mix(in srgb, var(--color-text-primary) 8%, transparent)';
/** Tooltips sit on `surface-raised` with a real (not 8%) border, so they read in both themes. */
export const CHART_TOOLTIP_STYLE = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 12,
  color: 'var(--color-text-primary)',
} as const;

export const CHART_AXIS_COLOR = 'var(--color-text-tertiary)';
