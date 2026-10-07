'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ApplyAsDoctorButton } from '@/features/landing/components/apply-as-doctor-button';
import { AudienceCopy } from '@/features/landing/components/audience-copy';
import { AudienceShowcase } from '@/features/landing/components/audience-showcase';
import { LandingSection } from '@/features/landing/components/landing-section';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Container } from '@/shared/ui/container';

/**
 * "For doctors": the full-bleed ink band (ink in BOTH themes -- it is the page's strongest moment), with the stage
 * of real workspace fragments at the start and the copy at the end, mirroring "For patients" above.
 *
 * The CTA is recruitment (ApplyAsDoctorButton picks the right destination per viewer), plus a link to the full
 * For Doctors page.
 */
export function ForDoctorsSection() {
  const t = useTranslations('landing.forDoctors');

  const cta = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <ApplyAsDoctorButton variant="accent" className="w-fit gap-2" />
      <Link href="/for-doctors" className="inline-flex items-center gap-1 rounded-sm text-small font-semibold text-on-ink-band underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
        {t('learnMore')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>
    </div>
  );

  return (
    <LandingSection id="for-doctors" variant="band" className="scroll-mt-16 bg-ink-band text-on-ink-band">
      <Container size="lg">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Copy first in the reading order (it comes first on a phone); on wide screens the stage takes the start. */}
          <AudienceCopy audience="doctor" tone="ink" cta={cta} className="lg:order-last lg:col-span-5" />
          <AudienceShowcase audience="doctor" className="min-w-0 rounded-(--r-card) bg-ink-band-raised p-4 sm:p-6 lg:col-span-7" />
        </div>
      </Container>
    </LandingSection>
  );
}
