'use client';

import { Pill, UserRound, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { DayStrip } from '@/features/doctor/components/today-timeline';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DateBlock } from '@/shared/ui/date-block';
import { MetricStat } from '@/shared/ui/metric-stat';
import { useRevealOnce } from '@/shared/ui/reveal-on-scroll';
import { TimeSlot } from '@/shared/ui/schedule/time-slot';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusBadge } from '@/shared/ui/status-badge';

export type Audience = 'patient' | 'doctor';

const HOUR = 3_600_000;
const STAGGER_MS = 80;
const LIME_DELAY_MS = 300;

/**
 * Tomorrow at a wall-clock time, as a UTC instant formatted with `timeZone: 'UTC'`: the vignettes' "10:00" reads
 * 10:00 on the server render and in every browser alike (no hydration drift), and the date is tomorrow in the
 * operating time zone.
 */
function tomorrowAt(hours: number, minutes = 0): Date {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' })
    .format(new Date())
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, hours, minutes));
}

/** A neutral avatar standing for a role ("Your doctor", "New patient"), never a person: a glyph, no name, no photo. */
function RoleAvatar() {
  return (
    <Avatar size="xs">
      <AvatarFallback>
        <Icon icon={UserRound} size="xs" />
      </AvatarFallback>
    </Avatar>
  );
}

/** The next visit, as the app's appointment row draws it: the DateBlock leads, the person rides inline (xs). */
export function NextVisitVignette() {
  const t = useTranslations('landing.showcase');
  const format = useFormatter();
  const visit = tomorrowAt(10);
  return (
    <Card className="flex items-center gap-4 p-4">
      <DateBlock date={visit} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-w-0 items-center gap-2 text-body font-medium text-text-primary">
          <RoleAvatar />
          <span className="truncate">{t('yourDoctor')}</span>
        </p>
        <p className="text-small text-text-tertiary">
          {t('tomorrowAt', { time: format.dateTime(visit, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) })}
        </p>
      </div>
      <StatusBadge status="confirmed" />
    </Card>
  );
}

/** The booking slot strip: five of tomorrow's times, the middle one selected (lime). */
export function SlotStripVignette({ limeOn }: { limeOn: boolean }) {
  const t = useTranslations('landing.showcase');
  const format = useFormatter();
  const times = [
    [9, 0],
    [9, 30],
    [10, 0],
    [10, 30],
    [11, 0],
  ] as const;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-small font-medium text-text-secondary">{t('tomorrow')}</p>
      {/* A row in reading order: it mirrors in Arabic by itself. */}
      <div className="grid grid-cols-5 gap-1.5">
        {times.map(([hours, minutes], index) => (
          <TimeSlot
            key={`${hours}:${minutes}`}
            time={format.dateTime(tomorrowAt(hours, minutes), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}
            status="available"
            selected={index === 2 && limeOn}
            className="justify-center px-1 text-xs whitespace-nowrap transition-colors duration-300"
          />
        ))}
      </div>
    </Card>
  );
}

/** A prescription: the pill glyph, the dose, "Active". The medicine's name is a placeholder bar, never an invented drug. */
export function PrescriptionVignette() {
  const t = useTranslations('landing.showcase');
  const tStatus = useTranslations('patient.dashboard.activePrescriptions.status');
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-emphasis">
        <Icon icon={Pill} size="sm" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-28 animate-none! bg-none!" />
        <p className="text-small text-text-secondary">{t('onceDaily')}</p>
      </div>
      <Badge variant="success">{tStatus('active')}</Badge>
    </Card>
  );
}

/** The doctor's day: the Overview's own strip with illustrative, relative hours ("−2h", "+2h"), no clock times. */
export function TimelineVignette({ markerClassName }: { markerClassName?: string }) {
  const t = useTranslations('landing.showcase');
  const tTimeline = useTranslations('doctorHome.timeline');
  const now = 4 * HOUR;
  // The offset in hours from now ("−2h" / "قبل 2 س"); the now mark itself carries no label (the marker says Now).
  const relative = (ms: number) => {
    const hours = Math.round((ms - now) / HOUR);
    if (hours === 0) return '';
    return hours < 0 ? t('hoursBefore', { count: -hours }) : t('hoursAfter', { count: hours });
  };
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-small font-medium text-text-secondary">{tTimeline('title')}</p>
      {/* Inset so the outermost hour labels (centred on their marks) stay inside the card. */}
      <DayStrip
        preview
        className="px-4"
        available={[{ start: 2 * HOUR, end: 6 * HOUR }]}
        booked={[
          { id: 'a', who: '', start: 2.5 * HOUR, end: 3.25 * HOUR },
          { id: 'b', who: '', start: 4.75 * HOUR, end: 5.25 * HOUR },
        ]}
        now={now}
        hourLabel={relative}
        timeLabel={relative}
        nowMarkerClassName={markerClassName}
      />
    </Card>
  );
}

/** A new appointment request, as the Queue's pending card: a role, never a name; the actions are inert. */
export function RequestVignette() {
  const t = useTranslations('landing.showcase');
  const tQueue = useTranslations('doctor.queue.pendingApproval');
  const format = useFormatter();
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <RoleAvatar />
        <p className="min-w-0 flex-1 text-body font-medium text-text-primary">{t('newRequest')}</p>
      </div>
      <p className="text-small text-text-tertiary">
        {t('newPatient')} · {t('tomorrowAt', { time: format.dateTime(tomorrowAt(10), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) })}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="destructive" size="sm" tabIndex={-1}>
          {tQueue('decline')}
        </Button>
        <Button type="button" size="sm" tabIndex={-1}>
          {tQueue('approve')}
        </Button>
      </div>
    </Card>
  );
}

/** Earnings: the shape of six months as bars, and no figure -- the value is a placeholder, never an invented amount. */
export function EarningsVignette() {
  const t = useTranslations('landing.showcase');
  return <MetricStat preview icon={Wallet} label={t('netThisMonth')} value="" sparkline={[3, 5, 4, 6, 5, 7]} sparklineStyle="bars" />;
}

// Staggered on wide screens: alternating 32px side offsets and a slight 12px overlap that lands on the cards'
// padding, never on their text; a snap row of cards on phones.
const OFFSETS = ['md:me-8', 'md:-mt-3 md:ms-8', 'md:-mt-3 md:ms-4 md:me-4'];

export interface AudienceShowcaseProps {
  audience: Audience;
  className?: string;
}

/**
 * The landing page's product preview for one audience: two or three small fragments of the real app, built from
 * the app's own components (no forked copies), illustrative by construction -- role labels instead of names, no
 * photos, no amounts or invented figures (placeholder bars instead), times from today's date in the viewer's
 * locale. The stage is decorative to assistive tech (`aria-hidden`, one sr-only sentence describes it) and every
 * fragment is `inert`, so nothing in it can be focused or clicked.
 *
 * Motion (once, at 10% in view, only when it starts below the fold, never under reduced motion): the fragments rise
 * 12px and fade in, 80ms apart; then the doctor's now-marker draws in and the patient's chosen slot takes its lime.
 * Without JavaScript, or with reduced motion, the final state is what renders.
 */
export function AudienceShowcase({ audience, className }: AudienceShowcaseProps) {
  const t = useTranslations(audience === 'patient' ? 'landing.forPatients' : 'landing.forDoctors');
  const { ref, revealed, animate } = useRevealOnce();
  const [limeDelayDone, setLimeDelayDone] = useState(false);

  useEffect(() => {
    if (!animate || !revealed) return;
    const timer = window.setTimeout(() => setLimeDelayDone(true), LIME_DELAY_MS + STAGGER_MS * 2);
    return () => window.clearTimeout(timer);
  }, [animate, revealed]);

  const limeOn = !animate || limeDelayDone;
  const markerClassName = animate
    ? cn('origin-bottom transition-transform duration-500 ease-out delay-500', revealed ? 'scale-y-100' : 'scale-y-0')
    : undefined;

  const vignettes: ReactNode[] =
    audience === 'patient'
      ? [<NextVisitVignette key="visit" />, <SlotStripVignette key="slots" limeOn={limeOn} />, <PrescriptionVignette key="rx" />]
      : [<TimelineVignette key="timeline" markerClassName={markerClassName} />, <RequestVignette key="request" />, <EarningsVignette key="earnings" />];

  return (
    <div className={className}>
      <p className="sr-only">{t('stageDescription')}</p>
      <div ref={ref} aria-hidden="true" role="presentation" data-showcase-stage="">
        <div className="scrollbar-hidden -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
          {vignettes.map((vignette, index) => (
            <div
              key={index}
              className={cn(
                'w-[85%] shrink-0 snap-center md:w-auto md:shadow-md md:rounded-(--r-card)',
                OFFSETS[index],
                animate && 'transition-[opacity,translate] duration-500 ease-out',
                revealed ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              )}
              style={animate ? { transitionDelay: `${index * STAGGER_MS}ms` } : undefined}
            >
              <div inert className="[zoom:0.9]">
                {vignette}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
