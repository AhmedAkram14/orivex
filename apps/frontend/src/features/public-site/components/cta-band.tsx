import type { ReactNode } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { LandingSection } from '@/features/landing/components/landing-section';
import { Container } from '@/shared/ui/container';

export interface CtaBandProps {
  title: string;
  description?: string;
  /** One or two `Button asChild` links. */
  actions: ReactNode;
}

/** The closing call-to-action panel every public page ends on -- the homepage CTA's tinted panel, without its illustration cards. */
export function CtaBand({ title, description, actions }: CtaBandProps) {
  return (
    <LandingSection fullBottom>
      <Container size="lg">
        <div className="relative overflow-hidden rounded-2xl border border-border-default bg-cta-surface px-6 py-12 sm:px-12">
          <div
            className="pointer-events-none absolute end-6 top-6 hidden size-16 opacity-40 sm:block"
            style={{ backgroundImage: 'radial-gradient(var(--color-border-strong) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <Heading as="h2" level={2} className="text-balance">
              {title}
            </Heading>
            {description && (
              <Text size="lg" tone="secondary" className="max-w-xl text-pretty">
                {description}
              </Text>
            )}
            <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:w-auto sm:flex-row">{actions}</div>
          </div>
        </div>
      </Container>
    </LandingSection>
  );
}
