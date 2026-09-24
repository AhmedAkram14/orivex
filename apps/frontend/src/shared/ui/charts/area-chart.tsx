'use client';

import { Area, AreaChart as RechartsAreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CHART_SERIES_COLORS } from '@/shared/ui/charts/chart-colors';
import type { ChartSeries } from '@/shared/ui/charts/line-chart';

export interface AreaChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: ChartSeries[];
  height?: number;
  /**
   * Recharts interpolation between points. Defaults to `'monotone'`
   * (unchanged for every existing caller). Phase 8: the Doctor Reports trend
   * chart passes `'linear'` -- its x-axis is a small number of *discrete*
   * daily buckets, and a smoothed spline curve implies fractional/continuous
   * values existed between them, which is misleading for a per-day count.
   */
  type?: 'monotone' | 'linear';
}

/** Generic themed area chart -- for trend-with-magnitude reads (e.g. revenue over time) where a line alone would under-communicate volume. */
export function AreaChart({ data, xKey, series, height = 260, type = 'monotone' }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'var(--color-surface)', border: `1px solid ${CHART_GRID_COLOR}`, borderRadius: 8 }} />
        {series.length > 1 && <Legend />}
        {series.map((item, index) => (
          <Area
            key={item.key}
            type={type}
            dataKey={item.key}
            name={item.label}
            stroke={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
