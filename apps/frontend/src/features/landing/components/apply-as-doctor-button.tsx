'use client';

import { ArrowRight, LayoutDashboard, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Button, type ButtonProps } from '@/shared/ui/button';

/**
 * The doctor-recruitment CTA, aware of who is looking:
 *   signed out          -> "Apply as a doctor" -> /register (the journey screen then offers the doctor path)
 *   signed-in patient   -> "Apply as a doctor" -> /doctor/onboarding (every account starts as a patient and is
 *                          promoted to doctor when an admin approves the application)
 *   signed-in doctor    -> "Go to your workspace" -> /doctor
 *   any other role      -> nothing (an admin can't apply, and has no doctor workspace)
 */
export function ApplyAsDoctorButton({ variant = 'primary', size = 'lg', className }: Pick<ButtonProps, 'variant' | 'size' | 'className'>) {
  const t = useTranslations('landing.forDoctors');
  const { status, user } = useAuth();
  const roles = status === 'authenticated' ? (user?.roles ?? []) : null;
  const viewer = roles === null ? 'signedOut' : roles.includes('doctor') ? 'doctor' : roles.includes('patient') ? 'patient' : 'other';

  if (viewer === 'other') return null;
  if (viewer === 'doctor') {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link href="/doctor">
          <Icon icon={LayoutDashboard} size="sm" />
          {t('ctaWorkspace')}
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={viewer === 'patient' ? '/doctor/onboarding' : '/register'}>
        <Icon icon={UserPlus} size="sm" />
        {t('ctaApply')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>
    </Button>
  );
}
