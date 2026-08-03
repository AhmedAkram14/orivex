import { Skeleton } from '@/shared/ui/skeleton';

/** Loading placeholder for a chart region of known height -- distinct from a text Skeleton so a chart never collapses to 0px while its data/bundle loads. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}
