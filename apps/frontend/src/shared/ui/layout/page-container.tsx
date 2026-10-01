import type { HTMLAttributes } from 'react';
import { Container, type ContainerProps } from '@/shared/ui/container';
import { cn } from '@/shared/lib/cn';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerProps['size'];
}

/** Consistent page-level vertical rhythm + horizontal centering, composed from Container rather than duplicating its responsive padding logic. Its children are the page's groups, one `--group-gap` apart; cards inside a group sit one `--card-gap` apart (`DashboardGroup`, `DashboardGrid`). */
export function PageContainer({ size = 'xl', className, children, ...props }: PageContainerProps) {
  return (
    <Container
      data-slot="page"
      size={size}
      className={cn('flex flex-col gap-(--group-gap) py-6 sm:py-8', className)}
      {...props}
    >
      {children}
    </Container>
  );
}
