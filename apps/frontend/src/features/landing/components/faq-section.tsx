'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  FileText,
  Headphones,
  Minus,
  ShieldCheck,
  UserPlus,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Accordion } from '@/shared/ui/accordion';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import { Container } from '@/shared/ui/container';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

import { FAQ_KEYS } from './faq-keys';

type Accent = NonNullable<BadgeProps['variant']>;

const FAQ_ITEMS: { key: (typeof FAQ_KEYS)[number]; icon: LucideIcon; accent: Accent }[] = [
  { key: 'booking', icon: CalendarCheck, accent: 'primary' },
  { key: 'becomeDoctor', icon: UserPlus, accent: 'success' },
  { key: 'verification', icon: ShieldCheck, accent: 'danger' },
  { key: 'consultations', icon: Video, accent: 'primary' },
  { key: 'prescriptions', icon: FileText, accent: 'warning' },
];

const ACCENT_CLASSES: Record<Accent, string> = {
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  neutral: 'bg-neutral-subtle text-neutral',
  info: 'bg-info-subtle text-info',
};

export function FaqSection() {
  const t = useTranslations('landing.faq');

  return (
    <Container id="faq" size="md" className="relative flex flex-col gap-8 py-16 scroll-mt-16">
      <div
        className="pointer-events-none absolute -start-4 top-0 hidden size-24 opacity-40 sm:block"
        style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -end-4 top-0 hidden size-24 opacity-40 sm:block"
        style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        aria-hidden="true"
      />

      <div className="flex flex-col items-center gap-2 text-center">
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={CircleHelp} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary">
          {t.rich('description', { brand: (chunks) => <span className="font-semibold text-primary">{chunks}</span> })}
        </Text>
      </div>

      <Accordion type="single" collapsible className="flex flex-col gap-3">
        {FAQ_ITEMS.map(({ key, icon, accent }) => (
          <AccordionPrimitive.Item
            key={key}
            value={key}
            className={cn(
              'rounded-2xl border border-border-default bg-surface px-5 transition-colors',
              'data-[state=open]:border-primary/30 data-[state=open]:bg-primary-subtle/40',
            )}
          >
            <AccordionPrimitive.Header className="flex">
              <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-3 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', ACCENT_CLASSES[accent])}>
                  <Icon icon={icon} size="sm" />
                </span>
                <span className="flex-1 font-semibold text-text-primary">{t(`items.${key}.question`)}</span>
                <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary in-data-[state=open]:flex">
                  <Icon icon={Minus} size="sm" />
                </span>
                <Icon
                  icon={ChevronDown}
                  size="sm"
                  className="shrink-0 text-text-tertiary transition-transform duration-(--duration-fast) in-data-[state=open]:hidden"
                />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-none">
              <div className="ms-4 border-s-2 border-primary/30 ps-4 pb-4">
                <Text size="sm" tone="secondary">
                  {t(`items.${key}.answer`)}
                </Text>
              </div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        ))}
      </Accordion>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-primary-subtle px-6 py-5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
            <Icon icon={Headphones} size="md" className="text-primary" />
          </span>
          <div className="flex flex-col text-center sm:text-start">
            <Text className="font-bold">{t('support.title')}</Text>
            <Text size="sm" tone="secondary">
              {t('support.description')}
            </Text>
          </div>
        </div>
        <a
          href="mailto:ahmed.akram7474@gmail.com"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {t('support.cta')}
        </a>
      </div>
    </Container>
  );
}
