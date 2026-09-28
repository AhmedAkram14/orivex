'use client';

import { CalendarClock, FileText, Users, Video, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StartConsultationAction } from '@/features/consultation/components/start-consultation-action';
import { TodayTimeline } from '@/features/doctor/components/today-timeline';
import { WelcomeHeader } from '@/features/doctor/components/welcome-header';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { HeroSurface } from '@/shared/ui/hero-surface';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { getCairoNow } from '@/shared/lib/date/timezone';

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  /** No reachable destination right now: the same secondary button, marked unavailable, with this reason in a tooltip. */
  disabledReason?: string;
}

/**
 * Every quick action is the same `secondary` button, so the row lines up and wraps evenly. An
 * unavailable one keeps its label and explains why in a tooltip (`aria-disabled`, not `disabled`,
 * so it stays focusable and the reason is reachable by keyboard and screen reader).
 */
function QuickAction({ icon, label, href, disabledReason }: QuickActionProps) {
  if (disabledReason || !href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-disabled="true"
            onClick={(event) => event.preventDefault()}
            className="cursor-not-allowed text-text-tertiary"
          >
            <Icon icon={icon} size="sm" />
            {label}
            <span className="sr-only">. {disabledReason}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={href}>
        <Icon icon={icon} size="sm" />
        {label}
      </Link>
    </Button>
  );
}

/**
 * The Overview's ONE hero surface (doctor variant, compact density): the
 * greeting (the page's h1), today's real numbers, the day as a timeline strip
 * built from the doctor's real hours and bookings, and quick actions as
 * secondary buttons. The 3D illustration is gone; the timeline is the visual.
 */
export function DashboardHero() {
  const t = useTranslations('doctor.dashboard');
  const { data: summary } = useDoctorDashboardSummary();
  const { data: upcomingWork } = useDoctorUpcomingWork();
  const { data: queue } = useDoctorQueue();

  const now = new Date();
  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Bounded to *today* -- a patient days from now is not "next" in any useful sense here.
  const nextPatient = (upcomingWork ?? [])
    .filter((item) => {
      const scheduledAt = new Date(item.scheduledAt);
      return (
        item.status === 'upcoming' &&
        scheduledAt.getTime() > now.getTime() &&
        isSameCalendarDay(getCairoNow(scheduledAt), getCairoNow(now))
      );
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  const minutesUntilNext = nextPatient
    ? Math.max(1, Math.round((new Date(nextPatient.scheduledAt).getTime() - now.getTime()) / 60000))
    : null;

  const startableEntry = (queue ?? []).find((entry) => entry.status === 'waiting');

  return (
    <HeroSurface variant="doctor" className="flex flex-col gap-5">
      <WelcomeHeader />

      <p className="text-body text-text-secondary">
        {t('hero.consultationsToday', { count: summary?.consultationsToday ?? 0 })}
        {' · '}
        {minutesUntilNext != null
          ? minutesUntilNext >= 60
            ? t('hero.nextPatientInHours', { hours: Math.round(minutesUntilNext / 60) })
            : t('hero.nextPatientIn', { minutes: minutesUntilNext })
          : t('hero.noMorePatientsToday')}
      </p>

      <TodayTimeline />

      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-2">
          {startableEntry && (
            <StartConsultationAction consultationSessionId={startableEntry.id} variant="accent" />
          )}
          {!startableEntry && (
            <QuickAction
              icon={Video}
              label={t('hero.quickActions.startConsultation')}
              disabledReason={t('hero.noStartableConsultation')}
            />
          )}
          <QuickAction icon={Users} label={t('hero.quickActions.viewQueue')} href="/doctor/queue" />
          <QuickAction
            icon={CalendarClock}
            label={t('hero.quickActions.updateSchedule')}
            href="/doctor/schedule"
          />
          <QuickAction
            icon={FileText}
            label={t('hero.quickActions.writePrescription')}
            disabledReason={t('hero.quickActions.writePrescriptionUnavailable')}
          />
        </div>
      </TooltipProvider>
    </HeroSurface>
  );
}
