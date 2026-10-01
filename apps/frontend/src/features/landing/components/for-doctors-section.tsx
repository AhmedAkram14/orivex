'use client';

import { ArrowRight, LayoutDashboard, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AudienceCopy } from '@/features/landing/components/audience-copy';
import { AudienceShowcase } from '@/features/landing/components/audience-showcase';
import { LandingSection } from '@/features/landing/components/landing-section';
import { useAuth } from '@/shared/auth/auth-context';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button } from '@/shared/ui/button';
import { Container } from '@/shared/ui/container';

/**
 * "For doctors": the full-bleed ink band (ink in BOTH themes -- it is the page's strongest moment), with the stage
 * of real workspace fragments at the start and the copy at the end, mirroring "For patients" above.
 *
 * The CTA is recruitment, never a dashboard link for someone who isn't a doctor:
 *   signed out          -> "Apply as a doctor" -> /register (the journey screen then offers the doctor path)
 *   signed-in patient   -> "Apply as a doctor" -> /doctor/onboarding (every account starts as a patient and is
 *                          promoted to doctor when an admin approves the application)
 *   signed-in doctor    -> "Go to your workspace" -> /doctor
 *   any other role      -> no CTA (an admin can't apply, and has no doctor workspace)
 */
export function ForDoctorsSection() {
  const t = useTranslations('landing.forDoctors');
  const { status, user } = useAuth();
  const roles = status === 'authenticated' ? (user?.roles ?? []) : null;
  const viewer = roles === null ? 'signedOut' : roles.includes('doctor') ? 'doctor' : roles.includes('patient') ? 'patient' : 'other';

  const cta =
    viewer === 'doctor' ? (
      <Button asChild variant="accent" size="lg" className="w-fit gap-2">
        <Link href="/doctor">
          <Icon icon={LayoutDashboard} size="sm" />
          {t('ctaWorkspace')}
        </Link>
      </Button>
    ) : viewer === 'other' ? null : (
      <Button asChild variant="accent" size="lg" className="w-fit gap-2">
        <Link href={viewer === 'patient' ? '/doctor/onboarding' : '/register'}>
          <Icon icon={UserPlus} size="sm" />
          {t('ctaApply')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>
      </Button>
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
