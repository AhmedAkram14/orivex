import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { Card, CardContent } from '@/shared/ui/card';
import { Logo } from '@/shared/ui/logo';

export interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** The consistent visual shell every auth page (login, register, forgot/reset password, verify email, check email) is built on, so a visitor moving between them sees one coherent surface, not five independently-styled pages. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Logo size="lg" className="text-primary" />
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-6 p-8">
          <div className="flex flex-col gap-1 text-center">
            <Heading level={2}>{title}</Heading>
            {description && <Text tone="secondary">{description}</Text>}
          </div>
          {children}
        </CardContent>
      </Card>
      {footer && <div className="text-sm text-text-secondary">{footer}</div>}
    </div>
  );
}
