import type { ReactNode } from 'react';
import { CircleCheck, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Heading, Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Card, CardContent } from '@/shared/ui/card';
import { Logo } from '@/shared/ui/logo';

export interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const PANEL_BULLET_KEYS = ['verified', 'secure', 'everywhere'] as const;

/**
 * The consistent visual shell every auth page (login, register, forgot/reset
 * password, verify email, check email) is built on -- a branded panel on the
 * start side (lg+, flat brand-color fill + soft circular shapes, no photo)
 * paired with the actual form card -- so a visitor moving between these
 * pages sees one coherent surface, not five independently-styled forms
 * floating alone on a blank canvas. Panel hides below `lg`; the form card
 * alone (this component's original layout) remains the whole experience on
 * mobile.
 */
export async function AuthCard({ title, description, children, footer }: AuthCardProps) {
  const t = await getTranslations('auth.panel');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div aria-hidden="true" className="absolute -end-20 -top-20 size-80 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -start-24 -bottom-24 size-96 rounded-full bg-white/10" />

        <Link href="/" className="relative flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-lg font-semibold">Orivex</span>
        </Link>

        <div className="relative flex flex-col gap-8">
          <Heading level={1} className="max-w-sm text-white">
            {t('headline')}
          </Heading>
          <ul className="flex flex-col gap-4">
            {PANEL_BULLET_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <Icon icon={CircleCheck} size="sm" className="mt-0.5 shrink-0 text-white" />
                <Text className="text-white/90">{t(`bullets.${key}`)}</Text>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-white/70">
          <Icon icon={ShieldCheck} size="sm" />
          {t('footer')}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
        <Logo size="lg" className="lg:hidden" />
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
    </div>
  );
}
