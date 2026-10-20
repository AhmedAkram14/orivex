'use client';

import { useFormatter } from 'next-intl';
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from '@/shared/ui/charts/chart-colors';

export interface PieSlice {
  name: string;
  value: number;
}

export interface PieChartProps {
  /** `name` is shown as-is in the legend and tooltip -- pass it already translated. */
  data: PieSlice[];
  height?: number;
  /** Donut when set (e.g. 55) -- same component as a pie chart, per the "donut = innerRadius prop" convention. */
  innerRadius?: number;
}

/**
 * Generic themed pie/donut chart. Identity is never color-alone: an HTML
 * legend under the plot names every slice with its count (it doubles as the
 * table view). The legend is ordinary flow content, so in Arabic the swatch
 * sits at the start of each entry, before its label, like every other list.
 */
export function PieChart({ data, height = 260, innerRadius = 0 }: PieChartProps) {
  const format = useFormatter();
  const color = (index: number) => CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={height - 40}>
        <RechartsPieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={innerRadius ? innerRadius + 40 : 90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={color(index)} stroke="var(--color-surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </RechartsPieChart>
      </ResponsiveContainer>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-small text-text-secondary">
        {data.map((entry, index) => (
          <li key={entry.name} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: color(index) }} />
            <span>{entry.name}</span>
            <span className="tabular-nums text-text-tertiary">
              <bdi>{format.number(entry.value)}</bdi>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
