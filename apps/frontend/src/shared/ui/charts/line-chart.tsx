'use client';

import { CartesianGrid, Line, LineChart as RechartsLineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CHART_SERIES_COLORS } from '@/shared/ui/charts/chart-colors';

export interface ChartSeries {
  key: string;
  label: string;
}

export interface LineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: ChartSeries[];
  height?: number;
}

/** Generic themed line chart -- one series per `series` entry, colored by fixed position (never cycled). A single series renders with no legend box (the widget's own title already names it). */
export function LineChart({ data, xKey, series, height = 260 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={{ background: 'var(--color-surface)', border: `1px solid ${CHART_GRID_COLOR}`, borderRadius: 8 }} />
        {series.length > 1 && <Legend />}
        {series.map((item, index) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
