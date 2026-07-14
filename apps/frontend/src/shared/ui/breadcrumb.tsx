import { Slot } from '@radix-ui/react-slot';
import { ChevronRight } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export function Breadcrumb({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Breadcrumb" className={className} {...props} />;
}

export function BreadcrumbList({ className, ...props }: HTMLAttributes<HTMLOListElement>) {
  return (
    <ol
      className={cn('flex flex-wrap items-center gap-1.5 text-sm text-text-secondary', className)}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('flex items-center gap-1.5', className)} {...props} />;
}

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Renders the child element (typically the locale-aware `Link` from `shared/i18n/navigation`) instead of a plain `<a>`, same composition pattern as `Button`'s `asChild`. */
  asChild?: boolean;
}

export function BreadcrumbLink({ asChild = false, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : 'a';
  return <Comp className={cn('transition-colors hover:text-text-primary', className)} {...props} />;
}

export function BreadcrumbPage({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span aria-current="page" className={cn('font-medium text-text-primary', className)} {...props} />
  );
}

export function BreadcrumbSeparator({ children }: { children?: ReactNode }) {
  return (
    <span role="presentation" aria-hidden="true">
      {children ?? <Icon icon={ChevronRight} size="xs" flipRtl className="text-text-tertiary" />}
    </span>
  );
}
