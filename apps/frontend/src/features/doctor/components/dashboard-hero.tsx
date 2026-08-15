'use client';

import { CalendarClock, FileText, Users, Video, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { StartConsultationAction } from '@/features/consultation/components/start-consultation-action';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { WelcomeHeader } from '@/features/doctor/components/welcome-header';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';

interface QuickActionTileProps {
  href: string;
  icon: LucideIcon;
  label: string;
  accentClassName: string;
}

/** One Quick Actions tile — a real destination link styled as a dashboard action card (icon in a soft colored circle, hover elevation), never a plain outlined button. */
function QuickActionTile({ href, icon, label, accentClassName }: QuickActionTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border-default bg-surface p-4 text-center transition-all duration-(--duration-fast) hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <span className={cn('flex size-12 items-center justify-center rounded-full transition-transform duration-(--duration-fast) group-hover:scale-105', accentClassName)}>
        <Icon icon={icon} size="lg" />
      </span>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </Link>
  );
}

/**
 * The redesigned Overview page's hero — the single visual focal point of
 * the page (Doctor Workspace dashboard redesign's hierarchy spec: hero >
 * KPIs > schedule/queue > bottom widgets). Folds the greeting (`WelcomeHeader`,
 * reused not rebuilt) and today's real consultation count / real
 * next-upcoming-today patient (an honest "no more patients today" when
 * none) into one card alongside a real Start Consultation entry point (only
 * live when a real waiting queue entry exists -- reuses
 * `StartConsultationAction`, never a fabricated always-on button), a Quick
 * Actions panel of real destinations redesigned as action-card tiles
 * (colored icon circles, not plain outlined links), and a doctor
 * illustration picked from the account's real `gender` field (defaulting to
 * male when unset/other -- a documented fallback, not a claim about the
 * doctor) floating over a soft brand-colored glow.
 */
export function DashboardHero() {
  const t = useTranslations('doctor.dashboard');
  const { data: account } = useMyAccount();
  const { data: summary } = useDoctorDashboardSummary();
  const { data: upcomingWork } = useDoctorUpcomingWork();
  const { data: queue } = useDoctorQueue();

  const now = new Date();
  const nextPatient = (upcomingWork ?? [])
    .filter((item) => item.status === 'upcoming' && new Date(item.scheduledAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  const minutesUntilNext = nextPatient
    ? Math.max(1, Math.round((new Date(nextPatient.scheduledAt).getTime() - now.getTime()) / 60000))
    : null;

  const startableEntry = (queue ?? []).find((entry) => entry.status === 'waiting');

  const illustration = account?.gender === 'female' ? '/dashboard-female.png' : '/dashboard-male.png';

  return (
    <Card className="relative overflow-hidden rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)] lg:min-h-64">
      <CardContent className="flex h-full flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex flex-1 flex-col gap-5">
          <WelcomeHeader />

          <p className="text-sm text-text-secondary">
            {t('hero.consultationsToday', { count: summary?.consultationsToday ?? 0 })}
            {' · '}
            {minutesUntilNext != null
              ? t('hero.nextPatientIn', { minutes: minutesUntilNext })
              : t('hero.noMorePatientsToday')}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {startableEntry ? (
              <StartConsultationAction consultationSessionId={startableEntry.id} />
            ) : (
              <Button type="button" disabled>
                {t('hero.noStartableConsultation')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickActionTile
              href="/doctor/queue"
              icon={Video}
              label={t('hero.quickActions.startConsultation')}
              accentClassName="bg-primary-subtle text-primary-emphasis"
            />
            <QuickActionTile
              href="/doctor/queue"
              icon={Users}
              label={t('hero.quickActions.viewQueue')}
              accentClassName="bg-warning-subtle text-warning-emphasis"
            />
            <QuickActionTile
              href="/doctor/schedule"
              icon={CalendarClock}
              label={t('hero.quickActions.updateSchedule')}
              accentClassName="bg-info-subtle text-info-emphasis"
            />
            <QuickActionTile
              href="/doctor/queue"
              icon={FileText}
              label={t('hero.quickActions.writePrescription')}
              accentClassName="bg-success-subtle text-success-emphasis"
            />
          </div>
        </div>

        <div className="relative hidden shrink-0 items-center justify-center lg:flex lg:size-56">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-primary-subtle)_0%,transparent_72%)] blur-2xl"
          />
          <div className="relative size-48">
            <Image src={illustration} alt="" fill sizes="192px" className="object-contain drop-shadow-xl" priority />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
