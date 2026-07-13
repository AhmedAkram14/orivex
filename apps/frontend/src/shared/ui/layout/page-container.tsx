import type { HTMLAttributes } from 'react';
import { Container, type ContainerProps } from '@/shared/ui/container';
import { cn } from '@/shared/lib/cn';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerProps['size'];
}

/** Consistent page-level vertical rhythm + horizontal centering, composed from Container rather than duplicating its responsive padding logic. */
export function PageContainer({ size = 'xl', className, children, ...props }: PageContainerProps) {
  return (
    <Container size={size} className={cn('flex flex-col gap-6 py-8', className)} {...props}>
      {children}
    </Container>
  );
}
