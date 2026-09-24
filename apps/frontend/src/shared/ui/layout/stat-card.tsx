import type { LucideIcon } from 'lucide-react';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

/**
 * A compact icon + label + value tile — for a dense row/grid of small stats,
 * distinct from MetricCard (one large KPI with a trend).
 *
 * Phase 8 (single stat tile): this is now a thin static wrapper over
 * `LinkableStatCard`, so there is exactly one implementation of the tile's
 * layout, two-line label reservation (baseline alignment across a row) and
 * long-value backstop -- previously each had its own copy that could drift.
 */
export function StatCard({ icon, label, value, className }: StatCardProps) {
  return <LinkableStatCard icon={icon} label={label} value={value} className={className} />;
}
