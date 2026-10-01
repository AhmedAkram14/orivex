'use client';

import { ArrowRight, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AudienceCopy } from '@/features/landing/components/audience-copy';
import { AudienceShowcase } from '@/features/landing/components/audience-showcase';
import { useAuth } from '@/shared/auth/auth-context';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

/**
 * "For patients": copy at the start, a stage of real app fragments at the end (mirrored by the doctors' section
 * below), on one warm surface. The CTA follows who is looking: anyone who can browse doctors (signed out, or a
 * patient) gets "Find a doctor"; a signed-in doctor or admin -- for whom the patient-only directory would be a
 * dead end -- sees it unavailable with a one-line reason, like Book on the doctor cards.
 */
export function ForPatientsSection() {
  const t = useTranslations('landing.forPatients');
  const { status, user } = useAuth();
  const canBrowse = status !== 'authenticated' || (user?.roles.includes('patient') ?? false);

  const cta = canBrowse ? (
    <Button asChild size="lg" className="w-fit gap-2">
      <Link href="/patient/doctors">
        <Icon icon={Search} size="sm" />
        {t('cta')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>
    </Button>
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* aria-disabled (not disabled) keeps it focusable, so the reason is reachable by keyboard too. */}
          <Button
            type="button"
            size="lg"
            aria-disabled="true"
            onClick={(event) => event.preventDefault()}
            className="w-fit cursor-not-allowed gap-2 bg-surface-2 text-text-tertiary hover:bg-surface-2"
          >
            <Icon icon={Search} size="sm" />
            {t('cta')}
            <span className="sr-only">. {t('ctaPatientsOnly')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('ctaPatientsOnly')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <section id="for-patients" className="scroll-mt-16 py-20">
      <Container size="lg">
        {/* Warm in light (peach to canvas); a ~10% warm tint on surface in dark (tokens). */}
        <div className="grid grid-cols-1 items-center gap-10 rounded-(--r-hero) bg-linear-to-br from-warm-1 to-warm-band-end p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-12">
          <AudienceCopy audience="patient" cta={cta} className="lg:col-span-5" />
          <AudienceShowcase audience="patient" className="min-w-0 lg:col-span-7" />
        </div>
      </Container>
    </section>
  );
}
