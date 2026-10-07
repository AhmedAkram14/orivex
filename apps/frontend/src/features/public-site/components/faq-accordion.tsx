'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Text } from '@/design-system/typography';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface FaqItem {
  /** Unique on the page -- also the item's `#anchor`, so a question can be deep-linked. */
  id: string;
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  items: readonly FaqItem[];
  /** Heading level of each question -- `h3` under a section's `h2` (the default), `h4` under a category `h3`. */
  headingLevel?: 'h3' | 'h4';
  className?: string;
}

function hashId(): string {
  return decodeURIComponent(window.location.hash.slice(1));
}

/**
 * Shared by the Help Center, specialty pages and How It Works. Radix
 * Accordion supplies the keyboard model (Enter/Space toggles, arrows/Home/End
 * move between questions) and `aria-expanded`/`aria-controls`. Every item
 * carries its own `id`, and arriving on `#that-id` (or the hash changing
 * later) opens it and scrolls it into view.
 */
export function FaqAccordion({ items, headingLevel = 'h3', className }: FaqAccordionProps) {
  const t = useTranslations('publicSite.common');
  const [open, setOpen] = useState<string[]>([]);
  const HeadingTag = headingLevel;

  useEffect(() => {
    function openFromHash() {
      const id = hashId();
      if (!id || !items.some((item) => item.id === id)) return;
      setOpen((current) => (current.includes(id) ? current : [...current, id]));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [items]);

  return (
    <AccordionPrimitive.Root type="multiple" value={open} onValueChange={setOpen} className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.id}
          id={item.id}
          value={item.id}
          className={cn(
            'scroll-mt-28 rounded-2xl border border-border-default bg-surface px-5 transition-colors',
            'data-[state=open]:border-primary/30 data-[state=open]:bg-primary-subtle/40',
          )}
        >
          <AccordionPrimitive.Header asChild>
            <HeadingTag className="flex">
              <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-3 rounded-md py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                <span className="flex-1 font-semibold text-text-primary">{item.question}</span>
                <Icon
                  icon={ChevronDown}
                  size="sm"
                  className="shrink-0 text-text-tertiary transition-transform duration-(--duration-fast) in-data-[state=open]:rotate-180"
                />
              </AccordionPrimitive.Trigger>
            </HeadingTag>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-none">
            <div className="flex flex-col gap-2 border-s-2 border-primary/30 ps-4 pb-4 ms-1">
              <Text size="sm" tone="secondary" className="whitespace-pre-line">
                {item.answer}
              </Text>
              <a
                href={`#${item.id}`}
                className="inline-flex w-fit items-center gap-1 rounded-sm text-caption text-text-tertiary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Icon icon={Link2} size="xs" />
                {t('linkToQuestion')}
              </a>
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
