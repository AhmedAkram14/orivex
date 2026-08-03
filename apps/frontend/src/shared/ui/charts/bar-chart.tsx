'use client';

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CHART_SERIES_COLORS } from '@/shared/ui/charts/chart-colors';
import type { ChartSeries } from '@/shared/ui/charts/line-chart';

export interface BarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: ChartSeries[];
  height?: number;
}

/** Generic themed bar chart -- rounded data-ends, a 2px surface gap between adjacent bars via `barGap`. */
export function BarChart({ data, xKey, series, height = 260 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'var(--color-surface)', border: `1px solid ${CHART_GRID_COLOR}`, borderRadius: 8 }} />
        {series.length > 1 && <Legend />}
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
