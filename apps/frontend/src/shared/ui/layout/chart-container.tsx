import { WidgetContainer, type WidgetContainerProps } from '@/shared/ui/layout/widget-container';

export type ChartContainerProps = WidgetContainerProps;

/**
 * The card shell a real chart mounts into once a charting library is
 * chosen and a business module has real series data (Phase 17's
 * Analytics, or any dashboard KPI once its module ships) — a fixed
 * min-height content area so a chart never collapses to 0px before its
 * data/library loads. This phase ships the container only: no chart
 * library is introduced here, and nothing renders this with fabricated
 * data — see this component's Storybook story for a sample-data
 * demonstration, which is not the same as shipping it on a real page.
 */
export function ChartContainer({ className, children, ...props }: ChartContainerProps) {
  return (
    <WidgetContainer className={className} {...props}>
      <div className="flex min-h-64 w-full items-center justify-center">{children}</div>
    </WidgetContainer>
  );
}
