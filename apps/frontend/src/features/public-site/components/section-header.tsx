import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';

export interface SectionHeaderProps {
  /** The small uppercase eyebrow above the title. */
  label?: string;
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'start';
  /** Semantic level -- `h1` only for a page hero; sections are `h2`. */
  as?: 'h1' | 'h2';
  /** Set when the surrounding `<section>` is labelled by this heading (`aria-labelledby`). */
  titleId?: string;
  className?: string;
}

/**
 * The landing page's section-heading pattern (small uppercase badge + big
 * title + secondary subtitle), extracted so every public page uses the same
 * one instead of re-typing it.
 */
export function SectionHeader({ label, icon, title, subtitle, align = 'center', as = 'h2', titleId, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2', align === 'center' ? 'items-center text-center' : 'items-start text-start', className)}>
      {label && (
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          {icon && <Icon icon={icon} size="xs" />}
          {label}
        </Badge>
      )}
      <Heading as={as} level={as === 'h1' ? 1 : 2} className="text-balance">
        <span id={titleId}>{title}</span>
      </Heading>
      {subtitle && (
        <Text tone="secondary" className={cn('max-w-2xl text-pretty', align === 'center' && 'mx-auto')}>
          {subtitle}
        </Text>
      )}
    </div>
  );
}
