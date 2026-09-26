'use client';

import { Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from '@/shared/ui/charts/chart-colors';

export interface PieSlice {
  name: string;
  value: number;
}

export interface PieChartProps {
  data: PieSlice[];
  height?: number;
  /** Donut when set (e.g. 55) -- same component as a pie chart, per the "donut = innerRadius prop" convention. */
  innerRadius?: number;
}

/** Generic themed pie/donut chart -- identity is never color-alone: every slice is legend + direct-labeled (name only, values live in the tooltip). */
export function PieChart({ data, height = 260, innerRadius = 0 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={innerRadius ? innerRadius + 40 : 90} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} stroke="var(--color-surface)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
